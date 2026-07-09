-- =============================================================================
-- Migration 0010: Customer cancellation rules
-- Run this in the Supabase SQL Editor.
--
-- Rules (customer-initiated cancellations only; admins are exempt):
--   1. A customer may cancel at most 3 bookings per day.
--   2. A booking cannot be cancelled within 1 hour of its scheduled start.
-- Times are interpreted in Asia/Manila (the venue's local time).
-- =============================================================================

create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_user_id     uuid;
  v_booking     public.bookings;
  v_before      numeric(12,2);
  v_after       numeric(12,2);
  v_start_ts    timestamptz;
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

  -- Customer-only restrictions (admins bypass these).
  if not public.is_admin() then
    -- Rule 2: no cancelling within 1 hour of the scheduled start.
    v_start_ts := (v_booking.booking_date + v_booking.start_time)
                    at time zone 'Asia/Manila';
    if v_start_ts <= now() + interval '1 hour' then
      raise exception
        'Bookings cannot be cancelled within 1 hour of the scheduled time';
    end if;

    -- Rule 1: max 3 cancellations per calendar day (Asia/Manila).
    select count(*) into v_cancel_count
    from public.bookings
    where user_id = v_booking.user_id
      and booking_status = 'CANCELLED'
      and (updated_at at time zone 'Asia/Manila')::date
          = (now() at time zone 'Asia/Manila')::date;
    if v_cancel_count >= 3 then
      raise exception 'You can only cancel up to 3 bookings per day';
    end if;
  end if;

  select wallet_balance into v_before from public.users
    where id = v_booking.user_id for update;
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
