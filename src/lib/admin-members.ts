import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemberPrivate } from "@/components/admin/AdminMemberCard";

/** Loads CNIC / phone for a list of profile ids (RLS lets admins read profile_private). */
export async function loadPrivate(supabase: SupabaseClient, ids: string[]) {
  const map = new Map<string, MemberPrivate>();
  if (ids.length === 0) return map;
  const { data } = await supabase.from("profile_private").select("profile_id, cnic_number, phone").in("profile_id", ids);
  for (const r of data ?? []) map.set(r.profile_id as string, { cnic_number: r.cnic_number, phone: r.phone });
  return map;
}
