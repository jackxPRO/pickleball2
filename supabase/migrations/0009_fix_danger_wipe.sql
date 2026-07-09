-- =============================================================================
-- Migration 0009: Fix danger_wipe_data (add WHERE clauses)
-- Run this in the Supabase SQL Editor.
--
-- WHY: Postgres/Supabase safe-update mode blocks unqualified DELETE statements
-- ("DELETE requires a WHERE clause"). Each delete now includes a WHERE clause.
-- =============================================================================

create or replace function public.danger_wipe_data()
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only a super admin can wipe data';
  end if;

  delete from public.wallet_transactions where id is not null;
  delete from public.wallet_topups where id is not null;
  delete from public.bookings where id is not null;
  delete from public.notifications where id is not null;
  delete from public.gallery where id is not null;
  delete from public.announcements where id is not null;

  -- Remove customer profiles but keep admin-linked profiles.
  delete from public.users
  where auth_id not in (
    select auth_id from public.admins where auth_id is not null
  );
end $$;
