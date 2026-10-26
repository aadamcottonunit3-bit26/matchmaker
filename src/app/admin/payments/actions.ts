"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function reviewPayment(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const approve = formData.get("decision") === "approve";
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!approve && !note) return; // rejection needs a note so the member knows why
  const supabase = await createClient();
  await supabase.rpc("admin_review_payment", { p_payment: id, p_approve: approve, p_note: note });
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
}
