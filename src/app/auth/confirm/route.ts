import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { allowIp } from "@/lib/rate-limit";
import { RESET_MARKER, RESET_MARKER_MAX_AGE } from "@/lib/password-reset";

/**
 * Landing point of the password-reset email.
 *  - ?token_hash=...&type=recovery  (recommended email template, works on any device)
 *  - ?code=...                      (default Supabase PKCE link, works in the browser that asked for the reset)
 * Only password-recovery links are accepted. Expired, invalid and already-used links are all rejected
 * with the same redirect. Tokens are never logged.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const code = params.get("code");

  if (!(await allowIp("confirm", 30, 900))) redirect("/forgot-password?error=invalid");

  const supabase = await createClient();
  let ok = false;
  if (tokenHash && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }
  if (!ok) redirect("/forgot-password?error=invalid");

  (await cookies()).set(RESET_MARKER, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: RESET_MARKER_MAX_AGE,
  });
  redirect("/reset-password");
}
