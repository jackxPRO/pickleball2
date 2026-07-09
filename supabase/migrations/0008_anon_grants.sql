-- =============================================================================
-- Migration 0008: Grant read access to anonymous (logged-out) visitors
-- Run this in the Supabase SQL Editor.
--
-- WHY: The public website (home, gallery, footer, map, pricing) is served to
-- logged-out users via the `anon` role. Without SELECT privileges the CMS data
-- comes back empty, so anonymous visitors saw a blank footer and a fallback map
-- while logged-in users saw the real content.
--
-- SAFETY: Row Level Security still governs which ROWS are visible. Private
-- tables (users, bookings, wallet_transactions, wallet_topups, admins,
-- notifications) have policies that require authentication, so `anon` sees no
-- rows there even with the grant. Public tables use `using (true)` policies.
-- =============================================================================

grant usage on schema public to anon;
grant select on all tables in schema public to anon;

-- Keep future tables readable by anon by default.
alter default privileges in schema public grant select on tables to anon;
