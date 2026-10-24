"use server";

import { revalidatePath } from "next/cache";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function respondPhotoRequest(formData: FormData) {
  const me = await requireMe();
  const id = String(formData.get("id") ?? "");
  const decision = formData.get("decision") === "approve" ? "approved" : "rejected";
  const supabase = await createClient();
  // RLS limits this update to requests addressed to the logged-in owner
  await supabase
    .from("photo_requests")
    .update({ status: decision, responded_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", me.id);
  revalidatePath("/photo-requests");
}
