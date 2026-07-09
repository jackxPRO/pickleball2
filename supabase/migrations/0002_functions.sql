-- =============================================================================
-- Migration 0002: Functions & triggers (business logic)
-- Atomic wallet + booking operations. All money-changing operations go through
-- these SECURITY DEFINER functions so the ledger stays consistent and the
-- wallet can never go negative.
-- =============================================================================

-- Helper: is the current auth user an admin? ----------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins a where a.auth_id = auth.uid()
  );
$$;

-- Helper: internal user id for the current auth user --------------------------
create or replace function public.current_user_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.users u where u.auth_id = auth.uid();
$$;

-- Auto-provision a users row when someone signs up ----------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (auth_id, email, full_name, phone)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (auth_id) do nothing;
  return new;
end $$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- FUNCTION: request a wallet top-up
-- =============================================================================
create or replace function public.request_topup(p_amount numeric, p_receipt text)
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

  insert into public.wallet_topups (user_id, amount, receipt_image, status)
  values (v_user_id, p_amount, p_receipt, 'PENDING')
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
-- FUNCTION: approve a top-up (admin only) — credits wallet atomically
-- =============================================================================
create or replace function public.approve_topup(p_topup_id uuid, p_remarks text default null)
returns public.wallet_transactions
language plpgsql security definer set search_path = public as $$
declare
  v_topup   public.wallet_topups;
  v_admin   uuid;
  v_before  numeric(12,2);
  v_after   numeric(12,2);
  v_tx      public.wallet_transactions;
begin
  if not public.is_admin() then
    raise exception 'Admin privileges required';
  end if;

  select id into v_admin from public.admins where auth_id = auth.uid();

  select * into v_topup from public.wallet_topups where id = p_topup_id for update;
  if not found then raise exception 'Top-up not found'; end if;
  if v_topup.status <> 'PENDING' then
    raise exception 'Top-up already %', v_topup.status;
  end if;

  select wallet_balance into v_before from public.users where id = v_topup.user_id for update;
  v_after := v_before + v_topup.amount;

  update public.users set wallet_balance = v_after where id = v_topup.user_id;

  update public.wallet_topups
    set status = 'APPROVED', admin_id = v_admin, remarks = p_remarks, approved_at = now()
    where id = p_topup_id;

  insert into public.wallet_transactions
    (user_id, type, amount, balance_before, balance_after, description, reference)
  values
    (v_topup.user_id, 'TOPUP', v_topup.amount, v_before, v_after,
     'Wallet top-up approved', v_topup.id::text)
  returning * into v_tx;

  insert into public.notifications (user_id, title, body, type)
  values (v_topup.user_id, 'Top-up approved',
          'Your wallet was credited ' || v_topup.amount || '.', 'TOPUP');

  return v_tx;
end $$;

-- =============================================================================
-- FUNCTION: reject a top-up (admin only)
-- =============================================================================
create or replace function public.reject_topup(p_topup_id uuid, p_remarks text default null)
returns public.wallet_topups
language plpgsql security definer set search_path = public as $$
declare
  v_topup public.wallet_topups;
  v_admin uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin privileges required';
  end if;
  select id into v_admin from public.admins where auth_id = auth.uid();

  select * into v_topup from public.wallet_topups where id = p_topup_id for update;
  if not found then raise exception 'Top-up not found'; end if;
  if v_topup.status <> 'PENDING' then
    raise exception 'Top-up already %', v_topup.status;
  end if;

  update public.wallet_topups
    set status = 'REJECTED', admin_id = v_admin, remarks = p_remarks, approved_at = now()
    where id = p_topup_id
    returning * into v_topup;

  insert into public.notifications (user_id, title, body, type)
  values (v_topup.user_id, 'Top-up rejected',
          coalesce('Reason: ' || p_remarks, 'Your top-up was rejected.'), 'TOPUP');

  return v_topup;
end $$;

-- =============================================================================
-- FUNCTION: create a booking — deducts wallet atomically
-- p_slots: array of start times ('HH:MM'), each 1 hour long.
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
    v_rate  := public.resolve_rate(v_court.hourly_rate, v_start);
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
    v_rate  := public.resolve_rate(v_court.hourly_rate, v_start);
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

-- =============================================================================
-- FUNCTION: resolve hourly rate by time-of-day pricing rules
-- Falls back to the court's base rate. Default business rule:
--   07:00-16:00 -> 150, 16:00-24:00 -> 200
-- =============================================================================
create or replace function public.resolve_rate(p_base numeric, p_start time)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare
  v_rate numeric(12,2);
begin
  select rate into v_rate
  from public.pricing_rules
  where active = true
    and start_time is not null and end_time is not null
    and p_start >= start_time and p_start < end_time
  order by rate desc
  limit 1;

  if v_rate is not null then
    return v_rate;
  end if;

  -- Hard-coded default fallback matching the business rules.
  if p_start >= time '16:00' then
    return 200;
  end if;
  return coalesce(p_base, 150);
end $$;

-- =============================================================================
-- FUNCTION: refund a booking (admin only) — full or partial
-- =============================================================================
create or replace function public.refund_booking(p_booking_id uuid, p_amount numeric default null)
returns public.wallet_transactions
language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings;
  v_before  numeric(12,2);
  v_after   numeric(12,2);
  v_refund  numeric(12,2);
  v_tx      public.wallet_transactions;
begin
  if not public.is_admin() then raise exception 'Admin privileges required'; end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_booking.booking_status = 'REFUNDED' then
    raise exception 'Booking already refunded';
  end if;

  v_refund := coalesce(p_amount, v_booking.amount);
  if v_refund <= 0 or v_refund > v_booking.amount then
    raise exception 'Invalid refund amount';
  end if;

  select wallet_balance into v_before from public.users where id = v_booking.user_id for update;
  v_after := v_before + v_refund;
  update public.users set wallet_balance = v_after where id = v_booking.user_id;

  update public.bookings
    set booking_status = 'REFUNDED'
    where id = p_booking_id;

  insert into public.wallet_transactions
    (user_id, type, amount, balance_before, balance_after, description, reference)
  values
    (v_booking.user_id, 'REFUND', v_refund, v_before, v_after,
     'Refund for booking ' || v_booking.booking_code, v_booking.id::text)
  returning * into v_tx;

  insert into public.notifications (user_id, title, body, type)
  values (v_booking.user_id, 'Booking refunded',
          v_refund || ' was refunded to your wallet.', 'REFUND');

  return v_tx;
end $$;

-- =============================================================================
-- FUNCTION: customer cancels their own booking (auto full refund)
-- Customer rules (admins exempt):
--   1. Max 3 cancellations per calendar day (Asia/Manila).
--   2. No cancelling within 1 hour of the scheduled start (Asia/Manila).
-- =============================================================================
create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_user_id      uuid;
  v_booking      public.bookings;
  v_before       numeric(12,2);
  v_after        numeric(12,2);
  v_start_ts     timestamptz;
  v_cancel_count int;
begin
  v_user_id := public.current_user_id();
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;

  if not public.is_admin() and v_booking.user_id <> v_user_id then
    raise exception 'Not allowed';
  end if;
  if v_booking.booking_status <> 'CONFIRMED' then
    raise exception 'Only confirmed bookings can be cancelled';
  end if;

  if not public.is_admin() then
    v_start_ts := (v_booking.booking_date + v_booking.start_time)
                    at time zone 'Asia/Manila';
    if v_start_ts <= now() + interval '1 hour' then
      raise exception
        'Bookings cannot be cancelled within 1 hour of the scheduled time';
    end if;

    select count(*) into v_cancel_count
    from public.bookings
    where user_id = v_booking.user_id
      and booking_status = 'CANCELLED'
      and (updated_at at time zone 'Asia/Manila')::date
          = (now() at time zone 'Asia/Manila')::date;
    if v_cancel_count >= 3 then
      raise exception
        'You can only cancel up to 3 bookings per day';
    end if;
  end if;

  select wallet_balance into v_before from public.users where id = v_booking.user_id for update;
  v_after := v_before + v_booking.amount;
  update public.users set wallet_balance = v_after where id = v_booking.user_id;

  update public.bookings set booking_status = 'CANCELLED' where id = p_booking_id
    returning * into v_booking;

  insert into public.wallet_transactions
    (user_id, type, amount, balance_before, balance_after, description, reference)
  values
    (v_booking.user_id, 'REFUND', v_booking.amount, v_before, v_after,
     'Cancellation refund for ' || v_booking.booking_code, v_booking.id::text);

  insert into public.notifications (user_id, title, body, type)
  values (v_booking.user_id, 'Booking cancelled',
          'Your booking was cancelled and refunded.', 'BOOKING');

  return v_booking;
end $$;

-- =============================================================================
-- FUNCTION: admin manual wallet adjustment (creates a transaction record)
-- =============================================================================
create or replace function public.adjust_wallet(
  p_user_id uuid, p_amount numeric, p_description text
)
returns public.wallet_transactions
language plpgsql security definer set search_path = public as $$
declare
  v_before numeric(12,2);
  v_after  numeric(12,2);
  v_tx     public.wallet_transactions;
begin
  if not public.is_admin() then raise exception 'Admin privileges required'; end if;

  select wallet_balance into v_before from public.users where id = p_user_id for update;
  if not found then raise exception 'User not found'; end if;

  v_after := v_before + p_amount;
  if v_after < 0 then raise exception 'Adjustment would make balance negative'; end if;

  update public.users set wallet_balance = v_after where id = p_user_id;

  insert into public.wallet_transactions
    (user_id, type, amount, balance_before, balance_after, description)
  values
    (p_user_id, 'ADJUSTMENT', p_amount, v_before, v_after,
     coalesce(p_description, 'Manual adjustment'))
  returning * into v_tx;

  return v_tx;
end $$;
