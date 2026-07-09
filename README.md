# 5 Point Pickleball Kiblawan — Court Booking & Management System

A production-ready, wallet-based pickleball court booking platform built with
**Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase**
(PostgreSQL, Auth, Storage, Row Level Security).

Premium dark-green / gold / white / black theme with glassmorphism, smooth
Framer Motion animations, loading skeletons, toast notifications, a fully
CMS-driven white-label front end, and a secure admin back office.

---

## ✨ Features

**Public site** — CMS-driven home page (hero, about, pricing, gallery,
operating hours, embedded Google Map, announcements, FAQs), responsive gallery
with filters/search/lightbox, floating Messenger button, and a Get Directions
button.

**Authentication** — Register, login, email verification, forgot/reset/change
password, edit profile. Guest booking is **not** allowed.

**Customer wallet** — Balance, transaction ledger (TOPUP / BOOKING / REFUND /
ADJUSTMENT), InstaPay top-ups with receipt upload and admin approval. Balance
can never go negative; the ledger is the source of truth.

**Booking** — Pick date → court → hourly slots with real-time availability,
double-booking prevention, automatic cost calculation (time-of-day rates),
atomic wallet deduction, instant confirmation, cancel & auto-refund.

**Admin** — Dashboard (revenue: daily/weekly/monthly/total, utilization),
booking management (view/edit/cancel/complete/refund), top-up approval, user
management (search/disable/adjust wallet), courts, pricing rules, payment
settings, media manager, announcements, booking calendar (day/week/month),
reports with CSV export, and a full Website CMS (branding, theme colors,
backgrounds, hero, contact, social links, maps, content).

---

## 🧱 Tech & architecture

- **Next.js 15** App Router, Server Components, Server Actions, Route Handlers
- **TypeScript** (strict), **Tailwind CSS**, **Framer Motion**
- **Supabase**: PostgreSQL, Auth, Storage, RLS, SECURITY DEFINER functions
- **TanStack Query / Table**, **React Hook Form**, **Zod**, **react-hot-toast**
- **Repository pattern** (`src/lib/repositories`) + clean separation of
  data-access, UI, and business logic (in the database for money-safe atomicity)

```
src/
  app/
    (auth)/        login, register, forgot/reset password
    (public)/      home, gallery  (+ navbar/footer/messenger)
    dashboard/     customer: home, book, wallet, bookings, profile
    admin/         overview, bookings, calendar, topups, users, courts,
                   pricing, payment, gallery, announcements, reports, settings
    auth/          callback + signout route handlers
  components/      ui/ (reusable), public/, dashboard/, admin/
  lib/
    supabase/      client, server, admin, middleware
    repositories/  settings, court, booking, wallet, user, content
    utils, validation, auth, theme, constants
  types/           database types
supabase/migrations/  0001..0005 SQL (schema, functions, RLS, seed, storage)
```

---

## 🚀 Getting started

### 1. Prerequisites
- Node.js 18.18+ (or 20+)
- A free [Supabase](https://supabase.com) project

### 2. Install
```bash
npm install
```

### 3. Environment
Copy `.env.example` to `.env.local` and fill in your Supabase keys
(Project Settings → API):
```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server only
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Database
Run the migrations **in order** in the Supabase SQL Editor
(or `supabase db push` with the CLI):
```
supabase/migrations/0001_schema.sql
supabase/migrations/0002_functions.sql
supabase/migrations/0003_rls.sql
supabase/migrations/0004_seed.sql
supabase/migrations/0005_storage.sql
```
See [docs/DATABASE.md](docs/DATABASE.md) for details.

### 5. Create your admin
Register a user in the app, then in the SQL Editor:
```sql
insert into public.admins (auth_id, email, role)
select id, email, 'SUPER_ADMIN' from auth.users where email = 'you@example.com';
```
Sign in — you'll be routed to `/admin`.

### 6. Auth redirect URLs
In Supabase → Authentication → URL Configuration, add:
```
http://localhost:3000/auth/callback
```
(plus your production domain).

### 7. Run
```bash
npm run dev       # http://localhost:3000
npm run build     # production build
```

---

## 🔒 Security

- **Row Level Security** on every table; customers only see their own rows.
- All money operations (top-up approval, booking, refund, adjustment) run
  through **SECURITY DEFINER** SQL functions — the wallet can never go negative
  and every credit/debit writes a ledger row.
- Private `receipts` storage bucket; admins view via short-lived signed URLs.
- Service-role key is server-only and never shipped to the browser.

---

## 🎨 White-label / CMS

Everything in **Admin → Website CMS** applies instantly (no redeploy):
business info, logos, favicon, theme colors (mapped to CSS variables),
backgrounds, hero content, contact details, social links, Google Maps, operating
hours, rates, FAQs, and facility rules. Defaults ship out of the box.

---

## 🔮 Future-ready

The architecture cleanly supports adding: automatic InstaPay verification,
GCash/Maya/card payments, email/SMS/push notifications, QR check-in, membership
& loyalty, promo codes, equipment/F&B, tournaments, subscriptions, and
multi-branch — without major refactoring. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 📄 License
Proprietary — © 5 Point Pickleball Kiblawan.
