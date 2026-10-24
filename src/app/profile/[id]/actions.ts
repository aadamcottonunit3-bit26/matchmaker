"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireMe, isActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function requestPhoto(formData: FormData) {
  const me = await requireMe();
  const ownerId = String(formData.get("owner_id") ?? "");
  if (!isActiveMember(me) || !ownerId || ownerId === me.id) return;

  const supabase = await createClient();
  // unique(requester_id, owner_id) makes repeated requests harmless
  await supabase.from("photo_requests").insert({ requester_id: me.id, owner_id: ownerId });
  revalidatePath(`/profile/${ownerId}`);
}

export async function startConversation(formData: FormData) {
  const me = await requireMe();
  const otherId = String(formData.get("other_id") ?? "");
  if (!isActiveMember(me) || !otherId || otherId === me.id) return;

  const [a, b] = me.id < otherId ? [me.id, otherId] : [otherId, me.id];
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_a", a)
    .eq("user_b", b)
    .maybeSingle();
  if (existing) redirect(`/messages/${existing.id}`);

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ user_a: a, user_b: b })
    .select("id")
    .single();
  if (error || !created) redirect(`/profile/${otherId}`);
  redirect(`/messages/${created.id}`);
}
