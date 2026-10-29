"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TOO_MANY, allowIp } from "@/lib/rate-limit";
import { RESET_MARKER } from "@/lib/password-reset";

export type ResetState = { error?: string } | undefined;

export async function updatePassword(_prev: ResetState, fd: FormData): Promise<ResetState> {
  const store = await cookies();
  // Only after a valid reset link was opened (see /auth/confirm). A normal login session is not enough.
  if (store.get(RESET_MARKER)?.value !== "1") redirect("/forgot-password?error=invalid");

  if (!(await allowIp("reset-submit", 10, 900))) return { error: TOO_MANY };

  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password.length > 72) return { error: "Password must be at most 72 characters." };
  if (password !== confirm) return { error: "The two passwords do not match." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    store.delete(RESET_MARKER);
    redirect("/forgot-password?error=invalid");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { error: "Please choose a password you have not used before." };
    if (error.code === "weak_password") return { error: "That password is too easy to guess. Please choose a stronger one." };
    console.error("[reset-password] update failed:", error.status ?? error.code ?? "unknown");
    return { error: "Could not change the password. Please request a new reset link and try again." };
  }

  // Sign out everywhere (every device and any session an attacker may have) and end the reset flow.
  await supabase.auth.signOut({ scope: "global" });
  store.delete(RESET_MARKER);
  redirect("/login?reset=success");
}
