# Forgot password — what you must configure (Supabase + Vercel)

The code is done (`/forgot-password`, `/auth/confirm`, `/reset-password`). It uses the existing Supabase Authentication; no separate
auth system. These dashboard steps cannot be done from code.

## How it works
1. Login page → **Forgot password?** → enter email → the site always answers with the same neutral message.
2. Supabase e-mails a one-time link → `https://<your site>/auth/confirm?token_hash=…&type=recovery`.
3. The site verifies the token (expired / used / invalid / wrong type → "invalid or expired" page), then shows the new-password page.
4. New password (8–72 characters, must match) → **all sessions are signed out** → login page with a success message.
Limits: 3 requests per email per hour and 10 per IP per hour (reset), 10 attempts per 15 minutes on the new-password form.

## Steps in Supabase (Authentication)
1. **URL Configuration → Site URL**: `https://matchmakerpk.vercel.app` (your real production address).
2. **URL Configuration → Redirect URLs**: add `https://matchmakerpk.vercel.app/auth/confirm` (add `http://localhost:3000/auth/confirm` only if you test locally).
   Without this, Supabase ignores the redirect and the link would not come back to `/auth/confirm`.
3. **Email Templates → Reset Password**: replace the link with
   ```html
   <h2>Reset your password</h2>
   <p>Click the link below to choose a new password. It can be used once and expires soon.</p>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset password</a></p>
   <p>If you did not ask for this, ignore this email.</p>
   ```
   This form works on any device. (The default `?code=` link also works, but only in the same browser that requested the reset.)
4. **SMTP Settings → Custom SMTP**: set up a real e-mail provider. Supabase's built-in e-mail service is intended for testing and is very
   limited (check the current docs); without your own SMTP, real members will not reliably receive reset e-mails.
5. Optional but recommended: shorten the e-mail link expiry (Providers → Email), turn on leaked-password protection, and turn **off** public sign-ups
   (this website creates accounts on the server, so it keeps working).

## Steps in Vercel
Environment Variables: `NEXT_PUBLIC_SITE_URL=https://matchmakerpk.vercel.app` (Production). Then **Redeploy**. The reset e-mail address is built only from this
variable (or Vercel's production URL), never from the request's Host header.
Run migration `0008` first (rate limiting): until then the limiter logs an error and lets requests through.

## Manual test after deploying (use a test account)
1. Request a reset for your test email → you get one email. 2. Request one for an email that is not registered → same message on screen, no email.
3. Open the link, set a new password → you land on the login page with a green message. 4. Open the same link again → "invalid, expired or already used".
5. Log in: the old password fails, the new one works. 6. Also test the admin account: reset, log in, you land in /admin.
