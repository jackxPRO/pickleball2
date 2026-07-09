-- =============================================================================
-- MIGRATION 0014: date-scheduled promos + promo-aware price computation
-- Adds optional date windows to pricing rules so admins can schedule a promo
-- for a specific date (or range). Bookings on those dates automatically use
-- the promo rate (with discount applied), so the amount charged reflects it.
-- =============================================================================

alter table public.pricing_rules
  add column if not exists start_date date,
  add column if not exists end_date   date;

comment on column public.pricing_rules.start_date is
  'Optional first date this rule applies (inclusive). Null = always.';
comment on column public.pricing_rules.end_date is
  'Optional last date this rule applies (inclusive). Null = always.';

-- =============================================================================
-- FUNCTION: resolve hourly rate by time-of-day + date pricing rules
-- Date-scoped rules (promos) take priority; the discount_pct is applied so the
-- returned value is the final price the customer pays.
-- =============================================================================
drop function if exists public.resolve_rate(numeric, time);
drop function if exists public.resolve_rate(numeric, time, date);
create or replace function public.resolve_rate(
  p_base  numeric,
  p_start time,
  p_date  date default null
)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare
  v_rate numeric(12,2);
  v_disc numeric(5,2);
begin
  select rate, coalesce(discount_pct, 0)
    into v_rate, v_disc
  from public.pricing_rules
  where active = true
    and start_time is not null and end_time is not null
    and p_start >= start_time and p_start < end_time
    and (start_date is null or (p_date is not null and p_date >= start_date))
    and (end_date   is null or (p_date is not null and p_date <= end_date))
  order by
    -- Date-scoped rules (scheduled promos) win over always-on rules.
    (case when start_date is not null or end_date is not null then 1 else 0 end) desc,
    -- Then the cheapest effective price for the customer.
    (rate - rate * coalesce(discount_pct, 0) / 100) asc
  limit 1;

  if v_rate is not null then
    return round(v_rate - v_rate * v_disc / 100, 2);
  end if;

  -- Hard-coded default fallback matching the business rules.
  if p_start >= time '16:00' then
    return 200;
  end if;
  return coalesce(p_base, 150);
end $$;

-- =============================================================================
-- FUNCTION: create_booking — now passes the booking date so scheduled promos
-- are honoured when computing each slot's rate.
-- =============================================================================
create or replace function public.create_booking(
  p_court_id uuid,
  p_date date,
  p_slots text[]
)
returns setof public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
  v_court   public.courts;
  v_before  numeric(12,2);
  v_after   numeric(12,2);
  v_total   numeric(12,2) := 0;
  v_slot    text;
  v_start   time;
  v_end     time;
  v_rate    numeric(12,2);
  v_code    text;
  v_booking public.bookings;
  v_created public.bookings[] := array[]::public.bookings[];
begin
  v_user_id := public.current_user_id();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  if array_length(p_slots, 1) is null then
    raise exception 'Select at least one time slot';
  end if;

  select * into v_court from public.courts where id = p_court_id;
  if not found then raise exception 'Court not found'; end if;
  if v_court.status <> 'ACTIVE' then raise exception 'Court is not available'; end if;

  -- Lock the user row while we compute + deduct.
  select wallet_balance into v_before from public.users where id = v_user_id for update;

  -- First pass: validate availability + compute total.
  foreach v_slot in array p_slots loop
    v_start := v_slot::time;
    v_end   := (v_slot::time + interval '1 hour');
    v_rate  := public.resolve_rate(v_court.hourly_rate, v_start, p_date);
    v_total := v_total + v_rate;

    if exists (
      select 1 from public.bookings b
      where b.court_id = p_court_id
        and b.booking_date = p_date
        and b.start_time = v_start
        and b.booking_status in ('CONFIRMED', 'COMPLETED')
    ) then
      raise exception 'Slot % is already booked', v_slot;
    end if;
  end loop;

  if v_before < v_total then
    raise exception 'Insufficient wallet balance. Needed %, available %', v_total, v_before;
  end if;

  v_after := v_before - v_total;
  update public.users set wallet_balance = v_after where id = v_user_id;

  -- Second pass: insert bookings.
  foreach v_slot in array p_slots loop
    v_start := v_slot::time;
    v_end   := (v_slot::time + interval '1 hour');
    v_rate  := public.resolve_rate(v_court.hourly_rate, v_start, p_date);
    v_code  := 'BK-' || to_char(now(), 'YYMMDD') || '-' ||
               upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

    insert into public.bookings
      (booking_code, user_id, court_id, booking_date, start_time, end_time, amount, booking_status)
    values
      (v_code, v_user_id, p_court_id, p_date, v_start, v_end, v_rate, 'CONFIRMED')
    returning * into v_booking;

    v_created := array_append(v_created, v_booking);
  end loop;

  insert into public.wallet_transactions
    (user_id, type, amount, balance_before, balance_after, description, reference)
  values
    (v_user_id, 'BOOKING', -v_total, v_before, v_after,
     'Court booking (' || array_length(p_slots, 1) || ' slot(s))', p_court_id::text);

  insert into public.notifications (user_id, title, body, type, link)
  values (v_user_id, 'Booking confirmed',
          'Your booking on ' || p_date || ' is confirmed.', 'BOOKING', '/dashboard/bookings');

  insert into public.notifications (is_admin, title, body, type, link)
  values (true, 'New booking',
          'A new booking was made for ' || p_date || '.', 'BOOKING', '/admin/bookings');

  return query select * from unnest(v_created);
end $$;
