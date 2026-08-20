-- 存储用量统计 RPC（M8 仪表盘使用）
create or replace function public.total_storage_bytes()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(size_bytes), 0)::bigint from public.images;
$$;
