-- =============================================================================
-- Migration 0011: Public court availability (booked slots)
-- Run this in the Supabase SQL Editor.
--
-- WHY: The bookings table's RLS only lets a customer see their OWN bookings,
-- so slots booked by other customers looked "available" until they tried to
-- book and got an error. This SECURITY DEFINER function returns only the
-- occupied time ranges for a court/date (no customer identity), so everyone
-- can see and be blocked from already-booked slots.
-- =============================================================================

create or replace function public.booked_slots(p_court_id uuid, p_date date)
returns table(start_time time, end_time time)
language sql
stable
security definer
set search_path = public as $$
  select b.start_time, b.end_time
  from public.bookings b
  where b.court_id = p_court_id
    and b.booking_date = p_date
    and b.booking_status in ('CONFIRMED', 'COMPLETED');
$$;

grant execute on function public.booked_slots(uuid, date) to authenticated, anon;
