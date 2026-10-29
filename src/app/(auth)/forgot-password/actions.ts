"use server";

import { createClient } from "@/lib/supabase/server";
import { TOO_MANY, allow, allowIp } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site-url";

export type ForgotState = { error?: string; sent?: boolean } | undefined;

export async function requestPasswordReset(_prev: ForgotState, fd: FormData): Promise<ForgotState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return { error: "Enter a valid email address." };

  // Anti-spam. The limits apply to ANY email string, so they reveal nothing about whether an account exists.
  if (!(await allowIp("reset", 10, 3600)) || !(await allow("reset-email", email, 3, 3600))) {
    return { error: TOO_MANY };
  }

  const base = await siteUrl();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    email,
    base ? { redirectTo: `${base}/auth/confirm` } : undefined
  );
  // Whatever happened (unknown email, provider limit, ...), the visitor gets the same neutral answer.
  if (error) console.error("[forgot-password] provider error:", error.status ?? error.code ?? "unknown");
  return { sent: true };
}
