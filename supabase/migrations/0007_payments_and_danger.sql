-- =============================================================================
-- Migration 0007: Multiple payment methods + Danger Zone wipe
-- Run this in the Supabase SQL Editor.
-- =============================================================================

-- Payment method type ---------------------------------------------------------
do $$ begin
  create type payment_method_type as enum ('GCASH', 'MAYA', 'BANK', 'INSTAPAY');
exception when duplicate_object then null; end $$;

-- TABLE: payment_methods ------------------------------------------------------
create table if not exists public.payment_methods (
  id             uuid primary key default gen_random_uuid(),
  type           payment_method_type not null,
  label          text not null,
  account_name   text,
  account_number text,
  qr_image       text,
  instructions   text,
  active         boolean not null default true,
  display_order  int not null default 0,
  created_at     timestamptz not null default now()
);

grant all on public.payment_methods to service_role;
grant select, insert, update, delete on public.payment_methods to authenticated;
grant select on public.payment_methods to anon;

alter table public.payment_methods enable row level security;

drop policy if exists pm_read on public.payment_methods;
create policy pm_read on public.payment_methods for select using (true);

drop policy if exists pm_admin on public.payment_methods;
create policy pm_admin on public.payment_methods
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed the four default methods (once) ----------------------------------------
insert into public.payment_methods (type, label, display_order)
select * from (values
  ('GCASH'::payment_method_type,    'GCash',         1),
  ('MAYA'::payment_method_type,     'Maya',          2),
  ('BANK'::payment_method_type,     'Bank Transfer', 3),
  ('INSTAPAY'::payment_method_type, 'InstaPay',      4)
) as v(type, label, display_order)
where not exists (select 1 from public.payment_methods);

-- Record which method a top-up used -------------------------------------------
alter table public.wallet_topups add column if not exists method text;

-- Recreate request_topup to accept an optional payment method ------------------
drop function if exists public.request_topup(numeric, text);
create or replace function public.request_topup(
  p_amount numeric,
  p_receipt text,
  p_method text default null
)
returns public.wallet_topups
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
  v_row public.wallet_topups;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  v_user_id := public.current_user_id();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.wallet_topups (user_id, amount, receipt_image, status, method)
  values (v_user_id, p_amount, p_receipt, 'PENDING', p_method)
  returning * into v_row;

  insert into public.notifications (user_id, title, body, type)
  values (v_user_id, 'Top-up submitted',
          'Your top-up of ' || p_amount || ' is pending approval.', 'TOPUP');

  insert into public.notifications (is_admin, title, body, type, link)
  values (true, 'New wallet top-up',
          'A customer submitted a top-up of ' || p_amount || '.', 'TOPUP', '/admin/topups');

  return v_row;
end $$;

-- =============================================================================
-- DANGER ZONE: wipe all operational data (super admin only).
-- Deletes customers, bookings, wallet history, top-ups, notifications, gallery,
-- and announcements. Preserves admins, website/payment settings, courts, and
-- pricing so the app remains configured.
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
