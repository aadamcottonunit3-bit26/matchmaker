"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireMe, isActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { REPORT_REASONS } from "@/lib/constants";
import { allow } from "@/lib/rate-limit";

export async function requestPhoto(formData: FormData) {
  const me = await requireMe();
  const ownerId = String(formData.get("owner_id") ?? "");
  if (!isActiveMember(me) || !ownerId || ownerId === me.id) return;
  if (!(await allow("photo-request", me.id, 40, 86400))) return;

  const supabase = await createClient();
  // unique(requester_id, owner_id) makes repeated requests harmless
  await supabase.from("photo_requests").insert({ requester_id: me.id, owner_id: ownerId });
  revalidatePath(`/profile/${ownerId}`);
}

export async function startConversation(formData: FormData) {
  const me = await requireMe();
  const otherId = String(formData.get("other_id") ?? "");
  if (!isActiveMember(me) || !otherId || otherId === me.id) return;
  if (!(await allow("new-chat", me.id, 30, 86400))) redirect(`/profile/${otherId}`);

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

export async function toggleShortlist(formData: FormData) {
  const me = await requireMe();
  const profileId = String(formData.get("profile_id") ?? "");
  if (!isActiveMember(me) || !profileId || profileId === me.id) return;
  if (!(await allow("shortlist", me.id, 200, 3600))) return;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("shortlists")
    .select("profile_id")
    .eq("user_id", me.id)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (existing) {
    await supabase.from("shortlists").delete().eq("user_id", me.id).eq("profile_id", profileId);
  } else {
    await supabase.from("shortlists").insert({ user_id: me.id, profile_id: profileId });
  }
  revalidatePath(`/profile/${profileId}`);
  revalidatePath("/shortlist");
}

export async function reportProfile(formData: FormData) {
  const me = await requireMe();
  const reportedId = String(formData.get("reported_id") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const details = String(formData.get("details") ?? "").trim().slice(0, 1000);
  if (!isActiveMember(me) || !reportedId || reportedId === me.id) return;
  if (!REPORT_REASONS.some((r) => r.value === reason)) return;
  if (!(await allow("report", me.id, 10, 86400))) return;

  const supabase = await createClient();
  // unique(reporter_id, reported_id): reporting the same profile twice is harmless
  await supabase.from("profile_reports").insert({
    reporter_id: me.id,
    reported_id: reportedId,
    reason,
    details: details || null,
  });
  revalidatePath(`/profile/${reportedId}`);
}
