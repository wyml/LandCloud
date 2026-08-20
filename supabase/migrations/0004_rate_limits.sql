-- M6: 分享限频（服务端 service role 专用，无 RLS 策略）
create table public.rate_limits (
  key text primary key,
  count integer not null default 0,
  window_start timestamptz not null default now()
);