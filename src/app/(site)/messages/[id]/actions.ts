"use server";

import { revalidatePath } from "next/cache";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { allow } from "@/lib/rate-limit";

export async function sendMessage(formData: FormData) {
  const me = await requireMe();
  const conversationId = String(formData.get("conversation_id") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  if (!conversationId || !body) return;
  // Anti-spam: at most 40 messages per 10 minutes and 400 per day (extra messages are simply not sent)
  if (!(await allow("msg10", me.id, 40, 600)) || !(await allow("msgday", me.id, 400, 86400))) return;

  const supabase = await createClient();
  // RLS: must be a participant and an active member
  await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: me.id, body });
  revalidatePath(`/messages/${conversationId}`);
}
