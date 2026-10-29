"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";
import { TOO_MANY, allow, allowIp } from "@/lib/rate-limit";

export type FormState = { error?: string } | undefined;

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!email || !password) return { error: "Enter your email and password." };

  // Brute-force protection: per IP address and per email (the same answer whether or not the email exists)
  if (!(await allowIp("login", 20, 900)) || !(await allow("login-email", email, 8, 900))) {
    return { error: TOO_MANY };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Invalid email or password." };

  // Admins only ever see the admin dashboard.
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (prof?.role === "admin") redirect(next.startsWith("/admin") ? next : "/admin");

  redirect(next);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
