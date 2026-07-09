-- =============================================================================
-- Migration 0013: Prevent disabling admin accounts
-- Run this in the Supabase SQL Editor.
--
-- WHY: Admins must never be locked out of the system. Even if a request tries
-- to set is_disabled = true on a user that is also an admin (matched by
-- auth_id or email), this trigger forces the flag back to false and raises an
-- error, guaranteeing admin accounts stay active regardless of the UI.
-- =============================================================================

create or replace function public.prevent_disabling_admin()
returns trigger
language plpgsql
security definer
set search_path = public as $$
begin
  if new.is_disabled = true and (old.is_disabled is distinct from true) then
    if exists (
      select 1 from public.admins a
      where a.auth_id = new.auth_id
         or lower(a.email) = lower(new.email)
    ) then
      raise exception 'Admin accounts cannot be disabled';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_prevent_disabling_admin on public.users;

create trigger trg_prevent_disabling_admin
  before update of is_disabled on public.users
  for each row
  execute function public.prevent_disabling_admin();
