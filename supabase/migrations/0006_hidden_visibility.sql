-- Add 'hidden' to visibility CHECK constraints

alter table public.images
  drop constraint images_visibility_check,
  add constraint images_visibility_check
    check (visibility in ('public', 'private', 'password', 'hidden'));

alter table public.albums
  drop constraint albums_visibility_check,
  add constraint albums_visibility_check
    check (visibility in ('public', 'private', 'password', 'hidden'));
