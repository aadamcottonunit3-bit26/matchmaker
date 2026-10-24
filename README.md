# Rishta Bureau — Marriage Bureau & Matchmaking Platform

Next.js 16 (App Router) · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Vercel

## Features
- **Registration**: gender, marital status, city + preferred cities, DOB with live age ("28 Years (Turning 29 on next birthday)"), CNIC + photo upload, partner preferences.
- **Matching**: Tier 1 hard filters in SQL (`match_candidates()`: opposite gender, marital status, city, mutual age range). Tier 2 weighted % score (education, profession, income, family, lifestyle) in `src/lib/matching.ts`.
- **Admin panel** (`/admin`): New Requests / Verified / Banned (mandatory reason, unblock) / Expired tabs, CNIC review with green-tick verification, payment approval queue (JazzCash / EasyPaisa / bank), activity log (who viewed whom + IP/device), read-only message monitor, audit logs, CMS for sliders, static pages and pricing.
- **Privacy**: Row Level Security on every table, private storage buckets for CNIC / receipts / photos, blurred photos with approve-to-reveal requests, CNIC visible only to the owner and admins.

## 1. Supabase
1. Create a project at supabase.com.
2. SQL Editor → paste and run `supabase/migrations/0001_schema.sql`.
3. Authentication → Providers → Email: enabled. (Registration creates pre-confirmed accounts server-side; identity is verified by the admin through CNIC.)

## 2. Run locally
```bash
cp .env.example .env.local     # fill in the 3 Supabase values + CRON_SECRET
npm install
npm run dev                    # http://localhost:3000
```

## 3. Create your admin account
1. Register normally at `/register`.
2. In Supabase SQL Editor run (use your user id from Authentication → Users):
```sql
update public.profiles set role='admin', status='verified', is_verified=true where id='YOUR-USER-ID';
```
3. Log in again — an **Admin** link appears in the header.

## 4. Deploy to Vercel
1. Push this folder to GitHub and import it in Vercel.
2. Add the 4 environment variables from `.env.example` in Project → Settings → Environment Variables.
3. Deploy. `vercel.json` schedules a daily job (`/api/cron/expire`) that marks memberships past their end date as **Expired**.

## 5. Things to customise
- Payment account numbers shown to members: `src/lib/constants.ts` → `PAYMENT_ACCOUNTS`.
- Site name: `src/components/Header.tsx`, `Footer.tsx`, `src/app/layout.tsx`.
- Plans, pricing, sliders, About / Terms / Privacy text: all editable from **Admin → CMS** (no code).
- Match weights: `WEIGHTS` in `src/lib/matching.ts`.
- Edit the Terms & Privacy text before launch (seed pages are empty).

## How the rules work
- A new profile is **pending** until an admin verifies it. Verification sets the green tick, moves it to the Verified tab and starts a Free-plan membership clock.
- Members must be verified **and** unexpired to browse, match, message and request photos.
- Paid plans: member uploads a receipt → admin approves → validity is extended from the later of today or current expiry.
- Admin message viewing is read-only (no UPDATE/DELETE policy exists) and each chat opened is logged. Opening CNIC documents is logged too.

## Security notes
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It is only used in server code (`src/lib/supabase/admin.ts`) after permission checks.
- A database trigger stops members from editing their own `role`, `status`, `is_verified`, `plan_id` or `valid_until`.
- Photos are served through `/api/photos/[id]`; for blurred photos the original never reaches an unapproved viewer.
- Before going live: set a strong admin password, enable Supabase backups, and add rate limiting / CAPTCHA on `/register` if you see abuse.
