-- =============================================================================
-- Migration 0016: Enable Realtime for live admin toast notifications
-- Run this in the Supabase SQL Editor.
--
-- Adds the `bookings` and `wallet_topups` tables to the `supabase_realtime`
-- publication so the admin dashboard can receive live INSERT/UPDATE events and
-- pop toast notifications (new booking, cancellation, refund, top-up requested,
-- top-up approved/rejected).
--
-- Row Level Security still applies to realtime: only admins (public.is_admin())
-- can read these rows, so only admin sessions receive the events.
-- =============================================================================

-- Ensure UPDATE payloads include the columns we read (status, booking_status).
alter table public.bookings      replica identity full;
alter table public.wallet_topups replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table public.bookings;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'wallet_topups'
  ) then
    alter publication supabase_realtime add table public.wallet_topups;
  end if;
end $$;
