# Security report — Rishta Bureau / Matchmaker PK

**Scope.** The source code in this project and its SQL migrations. The live Supabase project, the Vercel settings and the
Git history were **not accessible**, so nothing here claims the live site is secure. "Pass (local)" means it passed on a
local PostgreSQL 16 + a real PostgREST + the real Next.js app, with **simulated** Supabase Auth/Storage and synthetic
accounts. There is no Git repository in the zip, so no remediation branch could be created: commit these changes on a new
branch yourself before merging.

## 1. Decisions followed
CNIC number/images: admin-only, kept as records, no automatic deletion · encryption: proposal only (`ENCRYPTION_PROPOSAL.md`,
awaiting approval) · other members see an age only, never the date of birth · least privilege for all other personal data.

## 2. Executive summary
Before this work a member could, through the public API: read their own CNIC row and images, change their CNIC number after
verification, repoint their photo to another member's file (blur bypass), pre-set a plan or validity, change locked
identity fields, read every member's exact date of birth, income and other profile data in bulk, upload arbitrary files
straight into storage, and a visitor could call admin functions. All of these were **reproduced on the local database** and are
**fixed and re-tested**. Abuse protection (rate limits), upload validation, security headers, admin-page guards and a secure
password-reset flow were added. Open items: CNIC encryption (proposal), admin MFA, Supabase dashboard settings (manual), and
everything that needs the live project.

## 3. Findings (severity, evidence, status)
| # | Sev. | Finding | Evidence | Fix | Status |
|---|------|---------|----------|-----|--------|
| 1 | High | Photo blur bypass: member edits `photo_path`, `/api/photos/<own id>` serves another member's original | trigger did not protect the column; reproduced | trigger pins the path to `<own id>/photo.jpg` (0005); the route ignores the stored path and reads `<verified owner id>/photo.jpg` | **Fixed**. Pass (local + e2e) |
| 2 | High | Member could UPDATE own `profile_private` (CNIC number, file paths) | policy `private_update`; reproduced | no member write access at all (0005) | **Fixed**. Pass |
| 3 | High | Plan / `valid_until` could be pre-set by the member | policy `profiles_insert_own` | self-insert removed (registration is server-side); entitlements are changed only by admin functions (0005) | **Fixed**. Pass |
| 4 | Med | Verified members could change name/gender/DOB through the API | reproduced | database trigger freezes name and gender after verification; DOB is in a table members cannot write (0005, 0006) | **Fixed**. Pass |
| 5 | Med | Members could read their own CNIC row and images | policies `private_select`, `cnic_owner_read` | admin-only SELECT on table and Storage (0005) | **Fixed**. Pass |
| 6 | Med | Direct Storage uploads bypassing validation | policies `*_owner_insert` | policies removed; buckets limited to JPG/PNG/WebP 5 MB (0005) | **Fixed**. Policies Pass (local). Bucket limits **set, enforcement by real Storage Not Tested** |
| 7 | Med | Upload checks trusted the declared type; CNIC kept EXIF/GPS | code | `src/lib/image.ts`: size, magic bytes, decoder agreement, no animation, pixel limits, **re-encode to a fresh JPEG** (drops EXIF/GPS and appended payloads); server-generated file names | **Fixed**. Pass (15 unit tests + e2e: stored copy has no EXIF/GPS) |
| 8 | Med | Every active member could read every member's exact DOB | reproduced | DOB moved to `profile_birth` (owner + admin only); `profiles` keeps `age_years`, refreshed daily (0006, 0007) | **Fixed**. Pass (local + e2e: no DOB in HTML/RSC data/API) |
| 9 | Med | Bulk scraping of members through the API (names, income, …) | `profiles_select` | members can read **only their own row** through the API (0009); other members' data is served by the server as a limited object (`src/lib/public-profiles.ts`): income as a **band**, no DOB/phone/CNIC/plan/internal columns; matching runs server-side (`match_candidates_for`, service role only); profile views, matches and photo downloads are rate limited | **Fixed**. Pass (local + e2e). Residual: a legitimate member can still view profiles one by one (limit 300/hour) |
| 10 | Med | Registration revealed whether an email / CNIC exists | messages | one neutral message for both; rate limits | **Partly fixed**. Residual: success vs failure is still distinguishable; real prevention needs email verification before account creation (changes the sign-up flow: needs your approval) |
| 11 | Med | No rate limiting | – | `public.rate_limit_hit()` (Postgres, shared by all serverless instances; keys are HMAC-hashed): login, registration, forgot/reset password, reset-link confirm, messages, new chats, photo requests, reports, shortlist, payments/receipts, photo uploads, profile views, matches, photo downloads (0008) | **Fixed**. Pass (local + e2e: reset, login, registration limits). Fails **open** if the limiter itself is unavailable (logged) |
| 12 | Med | No security headers | `next.config.ts` | CSP, frame-ancestors/X-Frame-Options, nosniff, referrer policy, permissions policy, COOP, HSTS, no-store on private pages | **Fixed**. Pass (e2e: headers present, no CSP violation on public/member/admin pages). Residual: `script-src 'unsafe-inline'` (needed by Next.js; a nonce policy is a later step) |
| 13 | Low | 7 admin pages relied on layout + RLS only | grep | `requireAdmin()` in every admin page | **Fixed**. Pass (e2e: member/anonymous turned away) |
| 14 | Low | Messaging / photo requests to unverified, banned or admin users; re-assigning a photo request | policies | recipient must be a verified member, sender an active member (banned/expired cannot), request owner cannot re-assign (0005, 0009) | **Fixed**. Pass (local). There is no "block user" feature in the product |
| 15 | Low | Anonymous callers could run admin functions / `match_candidates()` | `has_function_privilege` | EXECUTE revoked from `anon` (0005); matching is service-role only (0008/0009) | **Fixed**. Pass |
| 16 | Feature | No forgot-password | – | `/forgot-password`, `/auth/confirm`, `/reset-password` (see `FORGOT_PASSWORD_SETUP.md`) | **Implemented**. Pass against **mock** Auth. Real Supabase e-mail flow **Not Tested** |
| 17 | Med | CNIC number stored as plaintext | schema | proposal only | **Open — awaiting your approval** |
| 18 | Med | Admin MFA, session re-authentication | – | recommended | **Open (manual)** |
| 19 | Low | Cron secret compared with `!==` | code | constant-time comparison | **Fixed** |

Re-checked existing controls: `npm audit --omit=dev` → **0 vulnerabilities** (re-run now) · no secret found in the source
(pattern scan; Git history not available) · service-role key used only in `server-only` modules · `.env*` git-ignored ·
admin role is a database column protected by a trigger, `user_metadata` unused · admin server actions use `requireAdmin` ·
open redirect on `next` is validated · CNIC never logged, admin CNIC views are audit-logged without the value.

## 4. CNIC data flow
| Step | Where |
|------|-------|
| Entered | `register` form → server action `src/app/(site)/register/actions.ts` (HTTPS) |
| Stored | table `public.profile_private` (`cnic_number`, `cnic_front_path`, `cnic_back_path`, `selfie_path`, `phone`), written only with the service role; images in private bucket `cnic-documents` as `<user id>/cnic-front.jpg`, `cnic-back.jpg`, `selfie.jpg` (re-encoded, no metadata) |
| Read | admin only: `src/app/admin/profiles/[id]/page.tsx` (full number, signed image links valid 5 min, audit log `view_cnic`), `src/app/admin/profiles/page.tsx` (search; list shows `12345-*******-1`), `src/lib/admin-members.ts` |
| Blocked | members/visitors: table (RLS + revoked privileges), Storage (policy), API routes (none returns CNIC), messages, logs, errors |
| Retention | kept as verification records (your decision); deletion/minimisation rules are **pending policy decisions** |

## 5. Changed files (this round)
**New:** `src/lib/{image,rate-limit,public-profiles,site-url,password-reset}.ts`, `src/app/(auth)/{layout.tsx,forgot-password/*,reset-password/*}`,
`src/app/auth/confirm/route.ts`, migrations `0008`, `0009`, rollback `0009`, `supabase/tests/{t_after8,t_after9,t_rate_limit}.sql`,
`tests/security/image-validation.ts`, `tests/e2e/*`, `FORGOT_PASSWORD_SETUP.md`, `ENCRYPTION_PROPOSAL.md`.
**Changed:** `src/lib/storage.ts` (verify + re-encode, server-only writes), `register/actions.ts` (limits, image checks, neutral duplicates),
`login/{actions,LoginForm,page}` (limits, "Forgot password?" link, success banner), `billing/actions.ts`, `my-profile/actions.ts`, `admin/cms/actions.ts`
(verified uploads), `profile/[id]/{page,actions}.tsx` (server-side limited profile, limits), `dashboard`, `shortlist`, `messages` (+`[id]`), `photo-requests`
pages (use `public-profiles`), `components/ProfileCard.tsx`, `api/photos/[profileId]/route.ts`, `api/cron/expire/route.ts`, the 7 admin pages (guards), `next.config.ts`, `.env.example`.
Earlier rounds: migrations `0005`–`0007`, DOB privacy, admin panel, etc.

## 6. Migrations (apply in this order)
| File | Purpose | When |
|------|---------|------|
| `0005_security_hardening.sql` | CNIC admin-only, no member writes to private data, photo path pinned, identity freeze, payment/chat/photo-request rules, storage policies + bucket limits, function privileges | now |
| `0006_private_birthdate.sql` | `profile_birth`, `age_years`, daily refresh, matching reads the private table | now |
| `0008_rate_limits_and_server_matching.sql` | rate limiter, `is_verified_member()`, `match_candidates_for()` — all additive | now |
| **deploy the new code, test** | | |
| `0007_drop_profiles_dob.sql` | drops the old `profiles.dob` (refuses to run if any date would be lost) | after the deploy works |
| `0009_restrict_member_profile_reads.sql` | members read only their own row through the API; policies no longer depend on reading others | after the deploy works |

Rollback: `supabase/rollback/0005_rollback.sql`, `0007_rollback.sql`, `0009_rollback.sql` (0006 and 0008 only add objects). Code: redeploy the previous Vercel deployment.
Nothing in these migrations deletes users, CNIC records, messages, photos or receipts.

## 7. Environment variables (placeholders only)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (**server only**), `CRON_SECRET`,
`NEXT_PUBLIC_SITE_URL` (new, needed for password-reset e-mails), optional `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_CONTACT_PHONE`.

## 8. Tests actually run (all local)
| Suite | Command | Result |
|-------|---------|--------|
| Database / RLS / storage policies / triggers | `supabase/tests/run.sh <postgres url>` | BEFORE the fixes 14 weaknesses reproduced · AFTER 0005 **37/37** · 0006 **13/13** · 0008 **12/12** · 0007 **13/13** · 0009 **17/17** · age trigger, under-18 check, rate limiter behaviour OK · 0005/0006 re-run safely (0008/0009 re-run **not tested**) · 0007 safety stop and rollback scripts verified |
| Upload validation | `npx tsx tests/security/image-validation.ts` | **15/15** (fake HTML, SVG, GIF, mismatched types, appended script, 100-megapixel bomb, too small/large, EXIF GPS removed, orientation) |
| Browser end-to-end (real Next app + real PostgREST/Postgres + mock Auth/Storage) | `tests/e2e/` | **86/86** — reset flow (registered/unregistered email identical answer, rate limit, valid link from another browser, mismatch/short/reused password, reused/expired/invalid/wrong-type links, direct page access, old password rejected, new works, old sessions signed out, admin reset + login to /admin), member/admin access, privacy of other members' data in HTML and API, direct API tampering attempts, photo blur + tampered path, registration + upload checks + EXIF stripped, headers/CSP, login brute force |
| Dependencies | `npm audit --omit=dev` | 0 vulnerabilities |
| Static | `tsc --noEmit`, `eslint`, `next build` | clean |

## 9. Regression
| Area | Result |
|------|--------|
| Registration (new member, uploads, auto login) | Pass (e2e) |
| Login / logout, admin → /admin, member → /dashboard | Pass (e2e) |
| Forgot / reset password | Pass against mock Auth; real Supabase **Not Tested** |
| Matching, dashboard, profile page, shortlist | Pass (dashboard + profile page e2e; shortlist/messages/photo-request pages **compile and type-check, not browser-tested**) |
| Messaging, photo requests, reports | Database rules Pass (local); UI actions **Not browser-tested** |
| Verification by admin, payments approval | Database functions Pass (local); admin member/payments pages open (e2e); approve/reject buttons **Not browser-tested** |
| Subscriptions (receipt upload) | Code updated and type-checked; **Not browser-tested** |

## 10. Manual actions (need your Supabase / Vercel access)
See `FORGOT_PASSWORD_SETUP.md` (Site URL, redirect URL, e-mail template, custom SMTP). Also: disable public sign-ups; enable leaked-password
protection; MFA for admin accounts; set Vercel env vars (incl. `NEXT_PUBLIC_SITE_URL`) and redeploy; run `supabase/security/diagnostics.sql`
and the checks in `supabase/tests/LIVE_CHECKLIST.md`; confirm in Supabase → Storage that all four buckets are private; rotate the
service-role key if it was ever exposed. Git history was not scanned.

## 11. Not tested / not verifiable here
Live Supabase and Vercel configuration · real e-mail delivery and real GoTrue token behaviour (expiry, one-time use) · the PKCE
(`?code=`) variant of the reset link · real Storage enforcement of bucket limits · MFA · email-scanner prefetch of reset links
(a scanner that opens the link first would consume it; the user simply requests a new one) · production load/rate-limit tuning.

## 12. Final checklist
| Requirement | Status |
|-------------|--------|
| Only admins can view CNIC numbers and images (table, Storage, API) | Pass (local + e2e) · live **Not Tested** |
| Members cannot read or alter CNIC data / paths | Pass |
| Members cannot obtain another member's original private photo | Pass |
| Members cannot manipulate plan, expiry or locked fields | Pass |
| Exact DOB not exposed to other members | Pass |
| Other private fields minimised in member-facing responses; scraping restricted | Pass (limits are per-member, see finding 9) |
| Storage: private buckets, no direct uploads, validated content | Pass (local) · real Storage limits **Not Tested** |
| Admin authorization on server + database; audit log without CNIC | Pass · MFA **Not Implemented** |
| Rate limiting on sensitive endpoints | Pass (local + e2e) · production tuning **Not Tested** |
| Security headers / CSP | Pass (e2e) · nonce-based CSP **Not Implemented** |
| Registration privacy | **Partial** (neutral message; no e-mail verification) |
| Forgot / reset password | Pass against mock Auth · real flow **Not Tested** |
| Encryption of CNIC at rest (application level) | **Not Implemented — proposal awaiting approval** |
| CNIC retention / deletion policy | **Pending decision** (records kept as instructed) |
| Live production configuration | **Not Tested** |
