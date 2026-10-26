"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function back(id: string, msg: string, kind: "ok" | "err" = "ok"): never {
  redirect(`/admin/profiles/${id}?${kind}=${encodeURIComponent(msg)}`);
}

export async function verifyProfile(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_verify_profile", { p_profile: id });
  revalidatePath("/admin/profiles");
  if (error) back(id, error.message, "err");
  back(id, "Profile verified. The green tick is now active.");
}

export async function banProfile(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 5) back(id, "A ban reason (at least 5 characters) is required.", "err");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_ban_profile", { p_profile: id, p_reason: reason });
  revalidatePath("/admin/profiles");
  if (error) back(id, error.message, "err");
  back(id, "Profile banned.");
}

export async function unbanProfile(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 5) back(id, "An unblock reason (at least 5 characters) is required.", "err");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_unban_profile", { p_profile: id, p_reason: reason });
  revalidatePath("/admin/profiles");
  if (error) back(id, error.message, "err");
  back(id, "Profile unblocked.");
}
