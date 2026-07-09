-- =============================================================================
-- Migration 0005: Storage buckets & policies
-- Buckets: receipts (private), branding (public), gallery (public), avatars (public)
-- =============================================================================

insert into storage.buckets (id, name, public)
values
  ('receipts', 'receipts', false),
  ('branding', 'branding', true),
  ('gallery',  'gallery',  true),
  ('avatars',  'avatars',  true)
on conflict (id) do nothing;

-- Public read for public buckets ----------------------------------------------
drop policy if exists "public read branding" on storage.objects;
create policy "public read branding" on storage.objects
  for select using (bucket_id in ('branding', 'gallery', 'avatars'));

-- Authenticated users can upload their own avatar -----------------------------
drop policy if exists "users upload avatar" on storage.objects;
create policy "users upload avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars');

drop policy if exists "users update avatar" on storage.objects;
create policy "users update avatar" on storage.objects
  for update to authenticated using (bucket_id = 'avatars');

-- Receipts: users upload their own; only admins read all ----------------------
drop policy if exists "users upload receipt" on storage.objects;
create policy "users upload receipt" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users read own receipt" on storage.objects;
create policy "users read own receipt" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- Branding / gallery writes: admins only --------------------------------------
drop policy if exists "admins manage branding" on storage.objects;
create policy "admins manage branding" on storage.objects
  for all to authenticated
  using (bucket_id in ('branding', 'gallery') and public.is_admin())
  with check (bucket_id in ('branding', 'gallery') and public.is_admin());
