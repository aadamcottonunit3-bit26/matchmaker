"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/admin";

export async function resolveReport(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("profile_reports")
    .update({ status: "resolved", resolved_by: admin.id, resolved_at: new Date().toISOString() })
    .eq("id", id);
  await logAdminAction(admin.id, "resolve_report", "report", id);
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}
