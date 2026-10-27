# Manual checks on your REAL Supabase project (staging account, synthetic users only)

Never use real members. Create two test members (A, B) and one test admin. Get a member's access token by
logging in on the website and reading it in DevTools -> Application -> Cookies, or via the Supabase Auth API.
Replace <URL>, <ANON_KEY>, <TOKEN_A> below. Every request must be answered as shown.

| # | Request (as member A) | Expected |
|---|-----------------------|----------|
| 1 | `GET <URL>/rest/v1/profile_private?select=*`  (apikey=<ANON_KEY>, Authorization=Bearer <TOKEN_A>) | `[]` or "permission denied" (never a row) |
| 2 | Same request with NO Authorization header (logged out) | "permission denied" |
| 3 | `PATCH .../profiles?id=eq.<A_ID>` body `{"role":"admin"}` | error "Not allowed to modify protected profile fields" |
| 4 | `PATCH .../profiles?id=eq.<A_ID>` body `{"photo_path":"<B_ID>/photo.jpg"}` | error "Invalid photo path" |
| 5 | `GET .../profiles?id=eq.<B_ID>&select=*` | no `dob` field; `age_years` present |
| 6 | `GET .../profile_birth?select=*` | only A's own row |
| 7 | `GET <URL>/storage/v1/object/cnic-documents/<B_ID>/cnic-front.jpg` | 400/404 (not found / not allowed) |
| 8 | `GET <URL>/storage/v1/object/cnic-documents/<A_ID>/cnic-front.jpg` (own file) | 400/404 (admin only) |
| 9 | `POST <URL>/rest/v1/rpc/admin_verify_profile` body `{"p_profile":"<B_ID>"}` | error "admin only" |
| 10 | As the TEST ADMIN: open /admin/profiles/<A_ID> | CNIC number, images and date of birth are visible |
| 11 | Logged-out browser: open `<URL>/storage/v1/object/public/cnic-documents/<A_ID>/cnic-front.jpg` | not found (bucket is private) |

Also run `supabase/security/diagnostics.sql` in the SQL editor and keep the output.
