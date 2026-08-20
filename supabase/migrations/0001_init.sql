-- PicBed 初始化 schema
-- 表结构见 docs/PRD.md §5.3

-- ============ 函数与基础 ============

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============ profiles ============

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============ app_config（RLS 用，仅 service role 可访问） ============

create table public.app_config (
  key text primary key,
  value text not null
);

-- 部署后必须通过 Supabase SQL Editor 或服务端接口改为真实管理员邮箱
insert into public.app_config (key, value) values ('admin_email', 'CHANGE_ME@example.com');

-- ============ albums ============

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  cover_image_id uuid,
  visibility text not null default 'public'
    check (visibility in ('public', 'private', 'password')),
  sort_order integer not null default 0,
  view_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index albums_visibility_idx on public.albums (visibility, sort_order);

create trigger albums_set_updated_at
before update on public.albums
for each row execute function public.set_updated_at();

-- ============ images ============

create table public.images (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  description text not null default '',
  original_name text not null,
  mime text not null,
  size_bytes bigint not null default 0,
  width integer,
  height integer,
  sha256 text not null unique,
  s3_key text not null,
  visibility text not null default 'public'
    check (visibility in ('public', 'private', 'password')),
  taken_at timestamptz,
  exif jsonb not null default '{}'::jsonb,
  gps_lat double precision,
  gps_lng double precision,
  view_count bigint not null default 0,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processing', 'done', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index images_created_at_idx on public.images (created_at desc);
create index images_taken_at_idx on public.images (taken_at desc);
create index images_visibility_idx on public.images (visibility);
create index images_processing_idx on public.images (processing_status);
create index images_gps_idx
  on public.images (gps_lat, gps_lng)
  where gps_lat is not null and gps_lng is not null;

create trigger images_set_updated_at
before update on public.images
for each row execute function public.set_updated_at();

alter table public.albums
  add constraint albums_cover_image_id_fkey
  foreign key (cover_image_id) references public.images (id) on delete set null;

-- ============ album_images（多对多） ============

create table public.album_images (
  album_id uuid not null references public.albums (id) on delete cascade,
  image_id uuid not null references public.images (id) on delete cascade,
  sort_order integer not null default 0,
  added_at timestamptz not null default now(),
  primary key (album_id, image_id)
);

create index album_images_image_idx on public.album_images (image_id);

-- ============ tags / image_tags ============

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.image_tags (
  image_id uuid not null references public.images (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (image_id, tag_id)
);

create index image_tags_tag_idx on public.image_tags (tag_id);

-- ============ shares ============

create table public.shares (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('album', 'image')),
  target_id uuid not null,
  password_hash text not null,
  expires_at timestamptz,
  view_count bigint not null default 0,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

create index shares_target_idx on public.shares (target_type, target_id);

-- ============ site_settings ============

create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

insert into public.site_settings (key, value) values
  ('site', '{"name":"PicBed 个人图床","logo":"","description":"个人图床相册网站","footer":"© PicBed"}'::jsonb),
  ('external_link', '{"direct_base":"","default_type":"proxy"}'::jsonb);

-- ============ 管理员判定函数 ============

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_config c
    where c.key = 'admin_email'
      and lower(c.value) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ============ RLS ============

alter table public.profiles enable row level security;
alter table public.app_config enable row level security;
alter table public.albums enable row level security;
alter table public.images enable row level security;
alter table public.album_images enable row level security;
alter table public.tags enable row level security;
alter table public.image_tags enable row level security;
alter table public.shares enable row level security;
alter table public.site_settings enable row level security;

-- app_config：无策略，仅 service role 可读写（RLS 默认拒绝）

-- profiles
create policy "profiles_select_self_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles_update_self_or_admin" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- albums
create policy "albums_select_public" on public.albums
  for select using (visibility = 'public' or public.is_admin());
create policy "albums_admin_insert" on public.albums
  for insert with check (public.is_admin());
create policy "albums_admin_update" on public.albums
  for update using (public.is_admin());
create policy "albums_admin_delete" on public.albums
  for delete using (public.is_admin());

-- images
create policy "images_select_public_done" on public.images
  for select using (
    (visibility = 'public' and processing_status = 'done') or public.is_admin()
  );
create policy "images_admin_insert" on public.images
  for insert with check (public.is_admin());
create policy "images_admin_update" on public.images
  for update using (public.is_admin());
create policy "images_admin_delete" on public.images
  for delete using (public.is_admin());

-- album_images
create policy "album_images_select_public" on public.album_images
  for select using (
    exists (
      select 1 from public.albums a
      where a.id = album_id and (a.visibility = 'public' or public.is_admin())
    )
    and exists (
      select 1 from public.images i
      where i.id = image_id and (i.visibility = 'public' or public.is_admin())
    )
  );
create policy "album_images_admin_insert" on public.album_images
  for insert with check (public.is_admin());
create policy "album_images_admin_update" on public.album_images
  for update using (public.is_admin());
create policy "album_images_admin_delete" on public.album_images
  for delete using (public.is_admin());

-- tags
create policy "tags_select_all" on public.tags
  for select using (true);
create policy "tags_admin_insert" on public.tags
  for insert with check (public.is_admin());
create policy "tags_admin_update" on public.tags
  for update using (public.is_admin());
create policy "tags_admin_delete" on public.tags
  for delete using (public.is_admin());

-- image_tags
create policy "image_tags_select_public" on public.image_tags
  for select using (
    exists (
      select 1 from public.images i
      where i.id = image_id and (i.visibility = 'public' or public.is_admin())
    )
  );
create policy "image_tags_admin_insert" on public.image_tags
  for insert with check (public.is_admin());
create policy "image_tags_admin_delete" on public.image_tags
  for delete using (public.is_admin());

-- shares：无公开策略，密码校验走服务端 service role
create policy "shares_admin_all" on public.shares
  for all using (public.is_admin()) with check (public.is_admin());

-- site_settings
create policy "site_settings_select_all" on public.site_settings
  for select using (true);
create policy "site_settings_admin_insert" on public.site_settings
  for insert with check (public.is_admin());
create policy "site_settings_admin_update" on public.site_settings
  for update using (public.is_admin());
create policy "site_settings_admin_delete" on public.site_settings
  for delete using (public.is_admin());
