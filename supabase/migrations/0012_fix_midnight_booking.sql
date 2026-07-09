-- =============================================================================
-- Migration 0012: Allow bookings that end at midnight (11:00 PM slot)
-- Run this in the Supabase SQL Editor.
--
-- WHY: Booking the 23:00 (11:00 PM) slot computes end_time as 23:00 + 1 hour,
-- which wraps around to 00:00. The chk_time_order constraint required
-- end_time > start_time, so the last slot of the day always failed with
-- "violates check constraint chk_time_order". We relax the constraint to
-- accept 00:00 as a valid (next-day midnight) end time.
-- =============================================================================

alter table public.bookings drop constraint if exists chk_time_order;

alter table public.bookings
  add constraint chk_time_order
  check (end_time > start_time or end_time = time '00:00');
