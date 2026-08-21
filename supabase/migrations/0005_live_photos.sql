-- 实况照片支持
-- 给 images 表增加 is_live_photo 和 live_photo_video_key 字段

alter table public.images
  add column is_live_photo boolean not null default false,
  add column live_photo_video_key text;

create index images_live_photo_idx on public.images (is_live_photo) where is_live_photo = true;
