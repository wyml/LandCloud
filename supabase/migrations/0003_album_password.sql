-- M5: 相册密码支持（加密相册）
alter table public.albums add column password_hash text not null default '';