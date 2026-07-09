-- =============================================================================
-- Migration 0006: Admin management (grants, super-admin RPCs, bootstrap)
-- Run this in the Supabase SQL Editor.
-- =============================================================================

-- 1) Ensure the API roles have the expected table privileges. -----------------
--    (RLS still governs row visibility; these are the base GRANTs PostgREST
--     needs. Safe to re-run.)
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines  in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;
alter default privileges in schema public
  grant select on tables to anon;

-- 2) is_super_admin() helper --------------------------------------------------
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins a
    where a.auth_id = auth.uid() and a.role = 'SUPER_ADMIN'
  );
$$;

-- 3) List admins (super admin only) -------------------------------------------
create or replace function public.list_admins()
returns setof public.admins
language sql security definer set search_path = public as $$
  select * from public.admins order by created_at asc;
$$;

-- 4) Grant / update an admin role (super admin only) --------------------------
--    p_auth_id must reference an existing auth user (create it first via the
--    service-role admin API).
create or replace function public.grant_admin(
  p_auth_id uuid,
  p_email   text,
  p_role    admin_role default 'ADMIN'
)
returns public.admins
language plpgsql security definer set search_path = public as $$
declare
  v_row public.admins;
begin
  if not public.is_super_admin() then
    raise exception 'Only a super admin can manage admins';
  end if;

  insert into public.admins (auth_id, email, role)
  values (p_auth_id, p_email, p_role)
  on conflict (auth_id)
    do update set role = excluded.role, email = excluded.email
  returning * into v_row;

  return v_row;
end $$;

-- 5) Revoke an admin (super admin only) ---------------------------------------
create or replace function public.revoke_admin(p_admin_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_target public.admins;
begin
  if not public.is_super_admin() then
    raise exception 'Only a super admin can manage admins';
  end if;

  select * into v_target from public.admins where id = p_admin_id;
  if not found then raise exception 'Admin not found'; end if;

  -- Prevent removing yourself.
  if v_target.auth_id = auth.uid() then
    raise exception 'You cannot remove your own admin access';
  end if;

  -- Prevent removing the last remaining super admin.
  if v_target.role = 'SUPER_ADMIN'
     and (select count(*) from public.admins where role = 'SUPER_ADMIN') <= 1 then
    raise exception 'Cannot remove the last super admin';
  end if;

  delete from public.admins where id = p_admin_id;
end $$;

-- 6) Allow super admins to insert/update/delete admin rows directly too. ------
drop policy if exists admins_super_manage on public.admins;
create policy admins_super_manage on public.admins
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- 7) Bootstrap the first super admin (auth user already created). -------------
insert into public.admins (auth_id, email, role)
select id, email, 'SUPER_ADMIN'
from auth.users
where lower(email) = 'admin@5pointpickleball.com'
on conflict (auth_id) do update set role = 'SUPER_ADMIN';
