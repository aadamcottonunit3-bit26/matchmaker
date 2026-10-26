"use server";

import { revalidatePath } from "next/cache";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function sendMessage(formData: FormData) {
  const me = await requireMe();
  const conversationId = String(formData.get("conversation_id") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  if (!conversationId || !body) return;

  const supabase = await createClient();
  // RLS: must be a participant and an active member
  await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: me.id, body });
  revalidatePath(`/messages/${conversationId}`);
}
