-- =============================================================================
-- Migration 0004: Seed data (defaults for 5 Point Pickleball Kiblawan)
-- Safe to run once on a fresh database.
-- =============================================================================

-- Website settings (single row) ----------------------------------------------
insert into public.website_settings (business_name)
select '5 Point Pickleball'
where not exists (select 1 from public.website_settings);

-- Payment settings (single row) -----------------------------------------------
insert into public.payment_settings (account_name, account_number, instructions)
select '5 Point Pickleball', '0000 0000 0000',
       'Send your top-up via InstaPay to the account above, then upload the receipt.'
where not exists (select 1 from public.payment_settings);

-- Courts (3 courts) -----------------------------------------------------------
insert into public.courts (name, hourly_rate, display_order)
select * from (values
  ('Court 1', 150::numeric, 1),
  ('Court 2', 150::numeric, 2),
  ('Court 3', 150::numeric, 3)
) as v(name, hourly_rate, display_order)
where not exists (select 1 from public.courts);

-- Pricing rules (time-of-day) -------------------------------------------------
insert into public.pricing_rules (name, rule_type, start_time, end_time, rate)
select * from (values
  ('Day Rate (7AM-4PM)',   'STANDARD', time '07:00', time '16:00', 150::numeric),
  ('Night Rate (4PM-12MN)','STANDARD', time '16:00', time '24:00', 200::numeric)
) as v(name, rule_type, start_time, end_time, rate)
where not exists (select 1 from public.pricing_rules);

-- =============================================================================
-- To create your first admin: sign up a user in the app, then run:
--   insert into public.admins (auth_id, email, role)
--   select id, email, 'SUPER_ADMIN' from auth.users where email = 'you@example.com';
-- =============================================================================
