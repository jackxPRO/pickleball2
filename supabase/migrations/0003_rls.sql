-- =============================================================================
-- Migration 0003: Row Level Security (RLS)
-- Customers can only read/write their own rows. Admins can do everything.
-- All money mutations happen via SECURITY DEFINER functions (0002), so direct
-- write access to ledger/booking tables is intentionally restricted.
-- =============================================================================

alter table public.users               enable row level security;
alter table public.admins              enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.wallet_topups       enable row level security;
alter table public.courts              enable row level security;
alter table public.pricing_rules       enable row level security;
alter table public.bookings            enable row level security;
alter table public.payment_settings    enable row level security;
alter table public.website_settings    enable row level security;
alter table public.gallery             enable row level security;
alter table public.announcements       enable row level security;
alter table public.notifications       enable row level security;

-- USERS -----------------------------------------------------------------------
drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
  for select using (auth_id = auth.uid() or public.is_admin());

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update using (auth_id = auth.uid())
  with check (auth_id = auth.uid());

drop policy if exists users_admin_all on public.users;
create policy users_admin_all on public.users
  for all using (public.is_admin()) with check (public.is_admin());

-- ADMINS ----------------------------------------------------------------------
drop policy if exists admins_select on public.admins;
create policy admins_select on public.admins
  for select using (public.is_admin());

-- WALLET TRANSACTIONS (read-only for owner; writes only via functions) --------
drop policy if exists wtx_select on public.wallet_transactions;
create policy wtx_select on public.wallet_transactions
  for select using (
    user_id = public.current_user_id() or public.is_admin()
  );

-- WALLET TOPUPS ---------------------------------------------------------------
drop policy if exists topups_select on public.wallet_topups;
create policy topups_select on public.wallet_topups
  for select using (
    user_id = public.current_user_id() or public.is_admin()
  );

drop policy if exists topups_admin_update on public.wallet_topups;
create policy topups_admin_update on public.wallet_topups
  for update using (public.is_admin()) with check (public.is_admin());

-- COURTS (public read; admin write) -------------------------------------------
drop policy if exists courts_read on public.courts;
create policy courts_read on public.courts for select using (true);

drop policy if exists courts_admin on public.courts;
create policy courts_admin on public.courts
  for all using (public.is_admin()) with check (public.is_admin());

-- PRICING RULES ---------------------------------------------------------------
drop policy if exists pricing_read on public.pricing_rules;
create policy pricing_read on public.pricing_rules for select using (true);

drop policy if exists pricing_admin on public.pricing_rules;
create policy pricing_admin on public.pricing_rules
  for all using (public.is_admin()) with check (public.is_admin());

-- BOOKINGS (owner read; admin all; writes via functions) ----------------------
drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings
  for select using (
    user_id = public.current_user_id() or public.is_admin()
  );

drop policy if exists bookings_admin on public.bookings;
create policy bookings_admin on public.bookings
  for all using (public.is_admin()) with check (public.is_admin());

-- PAYMENT SETTINGS (public read; admin write) ---------------------------------
drop policy if exists paysettings_read on public.payment_settings;
create policy paysettings_read on public.payment_settings for select using (true);

drop policy if exists paysettings_admin on public.payment_settings;
create policy paysettings_admin on public.payment_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- WEBSITE SETTINGS (public read; admin write) ---------------------------------
drop policy if exists websettings_read on public.website_settings;
create policy websettings_read on public.website_settings for select using (true);

drop policy if exists websettings_admin on public.website_settings;
create policy websettings_admin on public.website_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- GALLERY (public read; admin write) ------------------------------------------
drop policy if exists gallery_read on public.gallery;
create policy gallery_read on public.gallery for select using (true);

drop policy if exists gallery_admin on public.gallery;
create policy gallery_admin on public.gallery
  for all using (public.is_admin()) with check (public.is_admin());

-- ANNOUNCEMENTS (public read; admin write) ------------------------------------
drop policy if exists ann_read on public.announcements;
create policy ann_read on public.announcements for select using (true);

drop policy if exists ann_admin on public.announcements;
create policy ann_admin on public.announcements
  for all using (public.is_admin()) with check (public.is_admin());

-- NOTIFICATIONS ---------------------------------------------------------------
drop policy if exists notif_select on public.notifications;
create policy notif_select on public.notifications
  for select using (
    (is_admin = false and user_id = public.current_user_id())
    or (is_admin = true and public.is_admin())
  );

drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications
  for update using (
    (is_admin = false and user_id = public.current_user_id())
    or (is_admin = true and public.is_admin())
  );
