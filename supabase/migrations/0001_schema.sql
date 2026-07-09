-- =============================================================================
-- 5 POINT PICKLEBALL KIBLAWAN — DATABASE SCHEMA
-- Migration 0001: Core schema (extensions, enums, tables, indexes, triggers)
-- =============================================================================
-- Run these migrations in order in the Supabase SQL editor, or via the
-- Supabase CLI (`supabase db push`). See docs/DATABASE.md for details.
-- =============================================================================

-- Extensions ------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Enums -----------------------------------------------------------------------
do $$ begin
  create type wallet_transaction_type as enum ('TOPUP', 'BOOKING', 'REFUND', 'ADJUSTMENT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type topup_status as enum ('PENDING', 'APPROVED', 'REJECTED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status as enum ('CONFIRMED', 'CANCELLED', 'COMPLETED', 'REFUNDED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type court_status as enum ('ACTIVE', 'DISABLED', 'MAINTENANCE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type admin_role as enum ('SUPER_ADMIN', 'ADMIN', 'STAFF');
exception when duplicate_object then null; end $$;

-- =============================================================================
-- TABLE: users (customer profiles, 1:1 with auth.users)
-- =============================================================================
create table if not exists public.users (
  id             uuid primary key default gen_random_uuid(),
  auth_id        uuid not null unique references auth.users(id) on delete cascade,
  full_name      text not null default '',
  phone          text,
  email          text not null,
  avatar         text,
  wallet_balance numeric(12,2) not null default 0 check (wallet_balance >= 0),
  is_disabled    boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- =============================================================================
-- TABLE: admins (elevated access, keyed by auth email/uid)
-- =============================================================================
create table if not exists public.admins (
  id          uuid primary key default gen_random_uuid(),
  auth_id     uuid unique references auth.users(id) on delete cascade,
  email       text not null unique,
  role        admin_role not null default 'ADMIN',
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- TABLE: wallet_transactions (immutable ledger — source of truth)
-- =============================================================================
create table if not exists public.wallet_transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  type           wallet_transaction_type not null,
  amount         numeric(12,2) not null,
  balance_before numeric(12,2) not null,
  balance_after  numeric(12,2) not null,
  description    text,
  reference      text,
  created_at     timestamptz not null default now()
);

-- =============================================================================
-- TABLE: wallet_topups
-- =============================================================================
create table if not exists public.wallet_topups (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  amount        numeric(12,2) not null check (amount > 0),
  receipt_image text,
  status        topup_status not null default 'PENDING',
  admin_id      uuid references public.admins(id),
  remarks       text,
  created_at    timestamptz not null default now(),
  approved_at   timestamptz
);

-- =============================================================================
-- TABLE: courts
-- =============================================================================
create table if not exists public.courts (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  status        court_status not null default 'ACTIVE',
  hourly_rate   numeric(12,2) not null default 150,
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

-- =============================================================================
-- TABLE: pricing_rules (standard / weekday / weekend / holiday / promo)
-- =============================================================================
create table if not exists public.pricing_rules (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  rule_type   text not null default 'STANDARD', -- STANDARD | WEEKDAY | WEEKEND | HOLIDAY | PROMO
  start_time  time,        -- time-of-day window start (e.g. 07:00)
  end_time    time,        -- time-of-day window end   (e.g. 16:00)
  rate        numeric(12,2) not null,
  discount_pct numeric(5,2) default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- TABLE: bookings
-- =============================================================================
create table if not exists public.bookings (
  id             uuid primary key default gen_random_uuid(),
  booking_code   text not null unique,
  user_id        uuid not null references public.users(id) on delete cascade,
  court_id       uuid not null references public.courts(id),
  booking_date   date not null,
  start_time     time not null,
  end_time       time not null,
  amount         numeric(12,2) not null,
  booking_status booking_status not null default 'CONFIRMED',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint chk_time_order check (end_time > start_time)
);

-- Prevent overlapping active bookings on the same court/date.
create unique index if not exists uq_booking_slot
  on public.bookings (court_id, booking_date, start_time)
  where booking_status in ('CONFIRMED', 'COMPLETED');

-- =============================================================================
-- TABLE: payment_settings (single row, InstaPay top-up details)
-- =============================================================================
create table if not exists public.payment_settings (
  id             uuid primary key default gen_random_uuid(),
  qr_image       text,
  account_name   text,
  account_number text,
  instructions   text,
  updated_at     timestamptz not null default now()
);

-- =============================================================================
-- TABLE: website_settings (single row, full CMS)
-- =============================================================================
create table if not exists public.website_settings (
  id                    uuid primary key default gen_random_uuid(),
  business_name         text not null default '5 Point Pickleball',
  logo                  text,
  website_logo          text,
  login_logo            text,
  dashboard_logo        text,
  favicon               text,
  website_title         text default '5 Point Pickleball',
  business_description   text,
  about_us              text,
  vision                text,
  mission               text,
  address               text default 'Kiblawan, Davao del Sur',
  phone                 text,
  email                 text,
  facebook              text default 'https://www.facebook.com/profile.php?id=61588991677428',
  messenger             text default 'https://m.me/61588991677428',
  instagram             text,
  maps_link             text default 'https://maps.app.goo.gl/xw9AZd4ABcUKwUUS6',
  maps_embed            text default 'https://www.google.com/maps?q=6.6135233,125.2411783&z=17&output=embed',
  operating_hours       text default 'Daily, 7:00 AM – 12:00 MN',
  rental_rate           text default '₱150 (7AM-4PM) / ₱200 (4PM-12MN) per hour',
  currency              text default 'PHP',
  number_of_courts      int  default 3,
  -- Theme
  primary_color         text default '#0f4d2e',
  secondary_color       text default '#d4af37',
  accent_color          text default '#1f7a4d',
  glass_opacity         numeric(4,2) default 0.10,
  overlay_opacity       numeric(4,2) default 0.55,
  theme_mode            text default 'dark',
  -- Backgrounds
  hero_background       text,
  login_background      text,
  register_background   text,
  dashboard_background  text,
  booking_background    text,
  wallet_background     text,
  contact_background    text,
  about_background      text,
  -- Hero
  hero_title            text default 'Play at 5 Point Pickleball',
  hero_subtitle         text default 'Book premium courts in seconds. Top up your wallet, pick a slot, and play.',
  hero_cta_text         text default 'Book Now',
  hero_cta_link         text default '/book',
  -- Section toggles & ordering (JSON)
  sections              jsonb default '{}'::jsonb,
  faqs                  jsonb default '[]'::jsonb,
  facility_rules        jsonb default '[]'::jsonb,
  updated_at            timestamptz not null default now()
);

-- =============================================================================
-- TABLE: gallery
-- =============================================================================
create table if not exists public.gallery (
  id            uuid primary key default gen_random_uuid(),
  image_url     text not null,
  thumbnail_url text,
  category      text default 'General',
  title         text,
  description   text,
  is_cover      boolean not null default false,
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

-- =============================================================================
-- TABLE: announcements
-- =============================================================================
create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  image       text,
  start_date  date,
  end_date    date,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- TABLE: notifications
-- =============================================================================
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users(id) on delete cascade,
  is_admin    boolean not null default false,
  title       text not null,
  body        text,
  type        text default 'INFO',
  link        text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Indexes ---------------------------------------------------------------------
create index if not exists idx_wallet_tx_user    on public.wallet_transactions(user_id, created_at desc);
create index if not exists idx_topups_user       on public.wallet_topups(user_id, created_at desc);
create index if not exists idx_topups_status     on public.wallet_topups(status);
create index if not exists idx_bookings_user     on public.bookings(user_id, created_at desc);
create index if not exists idx_bookings_date     on public.bookings(booking_date, court_id);
create index if not exists idx_notifications_user on public.notifications(user_id, is_read, created_at desc);

-- Trigger: keep updated_at fresh ----------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_users_updated on public.users;
create trigger trg_users_updated before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists trg_bookings_updated on public.bookings;
create trigger trg_bookings_updated before update on public.bookings
  for each row execute function public.set_updated_at();
