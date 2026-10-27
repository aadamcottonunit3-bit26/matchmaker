# Security report — Rishta Bureau (Step 1: CNIC privacy + database hardening)

Scope of this report: the source code in the project zip and its SQL migrations. **The live Supabase project, Vercel
settings and Git history were not accessible**, so nothing below claims the live system is secure. "Pass (local)" means
the check passed on a local PostgreSQL 16 with a simulated Supabase layer (roles, `auth.uid()`, storage tables) using
synthetic accounts. It is not a test of the real Supabase Storage / PostgREST services.

## Decisions taken with the owner
1. Members never need to read their own CNIC again → CNIC data is **admin-only**.
2. CNIC images are kept as a record, visible to **admin only** (no automatic deletion).
3. CNIC number: admin-only now; encryption / retention policy to be decided later.
4. Other members see **age only** ("38 Years (Turning 39 on next birthday)"), never the exact date of birth.

## CNIC-related locations
| Kind | Where |
|------|-------|
| Table | `public.profile_private` (`cnic_number`, `cnic_front_path`, `cnic_back_path`, `selfie_path`, `phone`) |
| Storage | private bucket `cnic-documents` (`<user id>/cnic-front.*`, `cnic-back.*`, `selfie.*`) |
| Written by | `src/app/(site)/register/actions.ts` (service role, server only) |
| Read by | `src/app/admin/profiles/[id]/page.tsx` (admin; signed URLs valid 5 min; each view is audit-logged as `view_cnic`, no CNIC value stored), `src/app/admin/profiles/page.tsx` (search; list shows a masked number), `src/lib/admin-members.ts` |
| Not exposed | no API route or member page returns CNIC data (checked by reading all routes/actions) |

## Findings and status
| ID | Severity | Finding | Evidence | Status |
|----|----------|---------|----------|--------|
| F-01 | High | A member could set `profiles.photo_path` to another member's file; `/api/photos/<own id>` then serves the original (blur bypass) | `photo_path` was not protected by the trigger; route trusts the column. Reproduced on local DB (BEFORE test 4) | **Fixed** in 0005 (path pinned to `<id>/photo.jpg`; tampered rows repaired). Pass (local) |
| F-02 | High | Members could UPDATE their own `profile_private` row (change CNIC number / file paths after verification) | policy `private_update`; reproduced (BEFORE test 3) | **Fixed** in 0005 (no member write access at all). Pass (local) |
| F-03 | High | A member could insert their own profile row with a pre-set `plan_id` / `valid_until`, giving a free plan once an admin verifies | policy `profiles_insert_own` did not restrict those columns | **Fixed** in 0005 (self-insert removed; registration uses the server). Pass (local) |
| F-04 | Medium | Name / gender / date of birth were "locked after verification" only in the form; the API still allowed changes | reproduced (BEFORE test 5) | **Fixed** in 0005 (database trigger). Pass (local) |
| F-05 | Medium | Members could read their own CNIC row and CNIC images | policies `private_select`, `cnic_owner_read`; reproduced | **Fixed** in 0005 (admin only). Pass (local) |
| F-06 | Medium | Members could upload files straight into storage buckets, bypassing the server's checks | policies `*_owner_insert`; reproduced | **Fixed** in 0005 (policies removed; buckets limited to JPG/PNG/WebP, 5 MB). Policy part Pass (local); bucket limits set, enforcement by the real Storage service **Not tested** |
| F-07 | Medium | Every active member could read every member's exact date of birth through the API | `select dob from profiles` (reproduced, BEFORE test 14) | **Fixed** in 0006/0007 + code (DOB moved to private `profile_birth`; profiles keep `age_years`). Pass (local) |
| F-08 | Low | Logged-out visitors could call the admin RPCs and `match_candidates()` | `has_function_privilege('anon', …)` was true | **Fixed** in 0005. Pass (local) |
| F-09 | Low | A member could insert an already-"reviewed" payment, open chats with unverified users/the admin, send photo requests to unverified users, or re-assign a photo request | policies too loose | **Fixed** in 0005. Pass (local) |
| F-10 | Low | 7 admin pages rely on the layout and RLS only (no `requireAdmin()` in the page itself) | grep | **Open** (Step 3). Data is still protected by RLS |
| F-11 | Medium | Upload checks trust the browser-declared file type; CNIC images are stored as uploaded (metadata kept) | `src/lib/storage.ts` | **Open** (Step 2) |
| F-12 | Medium | No security headers (CSP, frame, nosniff, referrer) | `next.config.ts` | **Open** (Step 3) |
| F-13 | Medium | Registration reveals whether an email / CNIC already exists; no email verification; no rate limiting | `register/actions.ts` | **Open** (Step 4) |
| F-14 | Medium | CNIC number stored as plain text | schema | **Open** (decision pending: encrypt + hash for duplicate check) |
| F-15 | Info | Name, city, income, profession of all verified members stay visible to active members by design | `profiles_select` | Open for discussion |
| F-16 | Info | No password-reset flow in the app; no MFA for admin; Supabase Auth settings (public sign-ups, leaked-password protection) not verifiable | – | Manual / later |

## Verified positives (by reading code / running tools)
- `npm audit` (production dependencies): 0 vulnerabilities.
- No secret found in the source; `.env*` is git-ignored; the service-role client is in a `server-only` module.
- Admin role is a database column protected by a trigger; `user_metadata` is not used anywhere.
- All server actions and API routes call a guard; the cron route needs `CRON_SECRET`.
- The `next` redirect parameter is validated; passwords are handled by Supabase Auth.
- CNIC is never written to logs; admin CNIC views are audit-logged without the value.

## Test results (local, synthetic accounts) — `supabase/tests/run.sh`
BEFORE the fixes: 14 weaknesses/behaviours reproduced · AFTER 0005: 37/37 · AFTER 0006: 13/13 · AFTER 0007: 13/13 ·
trigger checks (age sync on insert/update, under-18 refused) pass · migrations re-run safely · 0007 refuses to run
if any profile would lose its date of birth · rollback scripts apply cleanly.

## Deployment order (do not skip steps)
1. Supabase → SQL Editor: run `0005_security_hardening.sql`. (Safe with the old and new code.)
2. Run `0006_private_birthdate.sql`.
3. Push the new code to GitHub (Vercel redeploys). Test: register a synthetic member, edit a profile, log in as admin and open the member (CNIC, selfie, DOB visible), check the dashboard shows an age.
4. Run `0007_drop_profiles_dob.sql` **only after step 3 works**.
5. Run `supabase/security/diagnostics.sql` and check: RLS true everywhere, buckets private, `anon` cannot run the admin functions.

Rollback: `supabase/rollback/0005_rollback.sql`, `supabase/rollback/0007_rollback.sql` (0006 only adds objects; leaving it in place is harmless).

## Manual actions still needed (cannot be done from code)
- Supabase → Authentication: **disable public sign-ups** (the server creates users with the service role) and enable leaked-password protection.
- Enable MFA for the admin account(s) (Supabase supports TOTP); enforcing it in the app is a later step.
- Check Vercel environment variables: `SUPABASE_SERVICE_ROLE_KEY` only on the server, never with a `NEXT_PUBLIC_` prefix. If it was ever pasted anywhere public, rotate it in Supabase.
- Git history was not available to scan for secrets.

## Not tested
Live Supabase configuration, real Storage/PostgREST behaviour, Vercel deployment, Git history, MFA, rate limits, content-type spoofing on upload (Step 2), browser-level XSS/CSRF tests.
