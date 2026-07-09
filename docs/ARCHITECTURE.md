# Architecture

## Layers

1. **Database (source of truth & business logic).** Postgres holds all
   money-safe operations in SECURITY DEFINER functions so concurrency and
   integrity are guaranteed regardless of the caller. RLS enforces access.
2. **Repository layer** (`src/lib/repositories`). Thin, typed wrappers around
   Supabase queries/RPCs. UI never talks to Supabase tables directly through
   ad-hoc queries — it goes through a repository, keeping data access consistent
   and swappable.
3. **Server Components / Route Handlers.** Fetch data on the server with the
   cookie-bound Supabase client (`lib/supabase/server`) and pass typed props
   down. Auth guards live in `lib/auth` (`requireUser`, `requireAdmin`).
4. **Client Components.** Interactive pieces (booking, wallet top-up, admin
   managers) use the browser client (`lib/supabase/client`) + React Hook Form +
   Zod, with optimistic UX via `router.refresh()` and toasts.

## Theming / white-label
`website_settings` stores colors; `lib/theme.ts` converts hex → RGB channels and
injects them as CSS variables on `<body>` in the root layout. Tailwind reads
`rgb(var(--color-primary) / <alpha>)`, so a CMS color change restyles the whole
app instantly with no redeploy. Logos/backgrounds are Storage URLs read at
request time.

## Auth flow
`middleware.ts` refreshes the Supabase session on each request and guards
`/dashboard` and `/admin`. Email links land on `/auth/callback` which exchanges
the code for a session. Admins are detected via the `admins` table and routed to
`/admin` on login.

## Extending (future-ready)
- **New payment providers (GCash/Maya/card/auto-InstaPay):** add a provider
  module + a new top-up creation path; approval still funnels through
  `approve_topup`/`adjust_wallet` so the ledger stays authoritative.
- **Notifications (email/SMS/push):** the `notifications` table already records
  events. Add a Supabase Edge Function triggered on insert to fan out to
  providers.
- **Membership / loyalty / promo codes:** add tables + a discount hook inside
  `resolve_rate` / `create_booking`.
- **Multi-branch:** add a `branches` table and a `branch_id` FK to
  courts/bookings/settings; scope RLS and repositories by branch.
- **QR check-in:** bookings already have a unique `booking_code`; render it as a
  QR and add a scan endpoint.

## Directory map
See the tree in the root `README.md`.
