"use server";

import { revalidatePath } from "next/cache";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extOf, uploadImage, validateImage } from "@/lib/storage";
import { strOrNull } from "@/lib/validators";

export type BillingState = { error?: string; ok?: boolean } | undefined;

export async function submitPayment(_prev: BillingState, fd: FormData): Promise<BillingState> {
  const me = await requireMe();
  if (me.status === "banned") return { error: "Your account is restricted." };

  const planId = String(fd.get("plan_id") ?? "");
  const method = String(fd.get("method") ?? "");
  const ref = strOrNull(fd.get("transaction_ref"));
  const receipt = fd.get("receipt") as File | null;

  if (!["jazzcash", "easypaisa", "bank_transfer"].includes(method)) return { error: "Select a payment method." };
  const fileErr = validateImage(receipt, "Receipt");
  if (fileErr) return { error: fileErr };

  // Price always comes from the database, never from the browser.
  const admin = createAdminClient();
  const { data: plan } = await admin.from("plans").select("id, price_pkr, is_active").eq("id", planId).maybeSingle();
  if (!plan || !plan.is_active || Number(plan.price_pkr) <= 0) return { error: "Select a paid plan." };

  const path = `${me.id}/${Date.now()}.${extOf(receipt!)}`;
  await uploadImage("payment-receipts", path, receipt!);

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    user_id: me.id,
    plan_id: plan.id,
    method,
    amount_pkr: plan.price_pkr,
    transaction_ref: ref,
    receipt_path: path,
    status: "pending",
  });
  if (error) return { error: "Could not submit your payment. Please try again." };

  revalidatePath("/billing");
  return { ok: true };
}
