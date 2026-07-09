# Database guide

Supabase PostgreSQL schema for the booking system. Migrations live in
`supabase/migrations/` and must run in numeric order.

## Migrations

| File | Purpose |
|------|---------|
| `0001_schema.sql`   | Extensions, enums, tables, indexes, `updated_at` triggers |
| `0002_functions.sql`| Business logic (SECURITY DEFINER): new-user trigger, top-ups, booking, refunds, adjustments, rate resolver |
| `0003_rls.sql`      | Row Level Security policies |
| `0004_seed.sql`     | Default website/payment settings, 3 courts, day/night pricing |
| `0005_storage.sql`  | Storage buckets (`receipts` private; `branding`/`gallery`/`avatars` public) + policies |

Run each file in the Supabase SQL Editor, or with the CLI:
```bash
supabase db push
```

## Tables

`users`, `admins`, `wallet_transactions`, `wallet_topups`, `courts`,
`pricing_rules`, `bookings`, `payment_settings`, `website_settings`, `gallery`,
`announcements`, `notifications`.

## Key functions (RPC)

| Function | Who | What |
|----------|-----|------|
| `handle_new_user()` (trigger) | system | Creates a `users` row on signup |
| `request_topup(amount, receipt)` | customer | Creates a PENDING top-up + notifications |
| `approve_topup(id, remarks)` | admin | Credits wallet atomically + ledger row |
| `reject_topup(id, remarks)` | admin | Marks rejected (no balance change) |
| `create_booking(court, date, slots[])` | customer | Validates availability, deducts wallet atomically, inserts bookings |
| `cancel_booking(id)` | customer/admin | Cancels + full refund to wallet |
| `refund_booking(id, amount?)` | admin | Full or partial refund |
| `adjust_wallet(user, amount, desc)` | admin | Manual adjustment + ledger row |
| `resolve_rate(base, start)` | system | Time-of-day rate (default 150 day / 200 night) |

### Money-safety invariants
- `users.wallet_balance` has a `CHECK (>= 0)` constraint.
- Every balance change happens inside a `SELECT ... FOR UPDATE` transaction and
  writes a matching `wallet_transactions` row (immutable ledger = source of truth).
- Double-booking is blocked by a partial unique index on
  `(court_id, booking_date, start_time)` for active statuses **and** re-checked
  inside `create_booking`.

## Creating an admin
```sql
insert into public.admins (auth_id, email, role)
select id, email, 'SUPER_ADMIN' from auth.users where email = 'you@example.com';
```

## Resetting seed data
The seed migration is idempotent (guards with `where not exists`). To re-seed,
delete the relevant rows first.
