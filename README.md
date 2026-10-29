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

## 5. Upgrade 0002 (admin panel, shortlist, reports, selfie check)
1. Supabase → SQL Editor → run `supabase/migrations/0002_upgrade.sql` **once, before deploying this code**.
2. Optional: set `NEXT_PUBLIC_WHATSAPP_NUMBER` and `NEXT_PUBLIC_CONTACT_PHONE` in Vercel for the WhatsApp button and contact buttons.
3. The admin panel is now a sidebar layout (mobile: slide-in menu). The members list supports search by name, CNIC, mobile and registration no.

## 6. Upgrade 0003 (personal details)
Run `supabase/migrations/0003_personal_details.sql` once in Supabase before deploying. It adds children, weight, body type, skin tone, mother tongue, hobbies and personality traits. Height is now chosen in feet + inches.

## 7. Upgrade 0004 (income range + home gallery)
Run `supabase/migrations/0004_income_range_and_gallery.sql` once in Supabase before deploying. It adds the upper end of the "monthly income required" range and lets the admin choose where a home image is shown (top banner or gallery) from Admin → Setup → Home images.

## 8. Security hardening (0005, 0006, 0007)
See `SECURITY_REPORT.md`. Order: run `0005` -> run `0006` -> push this code -> test -> run `0007`.
CNIC data is admin-only; other members only see an age, never the exact date of birth.
Local database tests: `supabase/tests/run.sh` (needs a local PostgreSQL). Live checks: `supabase/tests/LIVE_CHECKLIST.md`.

## 9. Security round 2 (0008, 0009, password reset, rate limits, upload checks, headers)
Order: `0005` -> `0006` -> `0008` -> push this code -> test -> `0007` -> `0009`. Details: `SECURITY_REPORT.md`.
Forgot / reset password: set `NEXT_PUBLIC_SITE_URL` and follow `FORGOT_PASSWORD_SETUP.md` (Supabase redirect URL, email template, SMTP).
CNIC encryption is only a proposal: `ENCRYPTION_PROPOSAL.md`.
Tests: `supabase/tests/run.sh` (database), `npx tsx tests/security/image-validation.ts` (uploads), `tests/e2e/` (browser end-to-end harness).
