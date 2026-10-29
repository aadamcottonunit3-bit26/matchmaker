import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { allow } from "@/lib/rate-limit";
import { rankMatches, scoreMatch } from "@/lib/matching";
import { incomeBandLabel } from "@/lib/income";
import type { Profile } from "@/lib/types";

/**
 * What ONE member may see about ANOTHER member.
 * Members cannot read other members' rows through the database API any more (migration 0009): this file is the
 * only way, it runs on the server, and it returns just these fields. Not included: date of birth, exact income,
 * phone, CNIC, plan / validity / status, verifier, photo path and every other internal column.
 */
export type PublicProfile = Pick<
  Profile,
  | "id" | "reg_no" | "full_name" | "gender" | "marital_status" | "age_years" | "city" | "education" | "profession"
  | "family_background" | "lifestyle" | "about" | "height_cm" | "children_count" | "weight_kg" | "body_type"
  | "skin_tone" | "mother_tongue" | "hobbies" | "personality" | "sect" | "marriage_timeline" | "is_verified"
  | "blur_photo" | "pref_age_min" | "pref_age_max" | "pref_marital" | "pref_education" | "pref_profession"
  | "pref_income_min_pkr" | "pref_income_max_pkr" | "preferred_cities"
> & { income_band: string | null };

export function toPublicProfile(p: Profile): PublicProfile {
  return {
    id: p.id,
    reg_no: p.reg_no,
    full_name: p.full_name,
    gender: p.gender,
    marital_status: p.marital_status,
    age_years: p.age_years,
    city: p.city,
    education: p.education,
    profession: p.profession,
    family_background: p.family_background,
    lifestyle: p.lifestyle,
    about: p.about,
    height_cm: p.height_cm,
    children_count: p.children_count,
    weight_kg: p.weight_kg,
    body_type: p.body_type,
    skin_tone: p.skin_tone,
    mother_tongue: p.mother_tongue,
    hobbies: p.hobbies,
    personality: p.personality ?? [],
    sect: p.sect,
    marriage_timeline: p.marriage_timeline,
    is_verified: p.is_verified,
    blur_photo: p.blur_photo,
    pref_age_min: p.pref_age_min,
    pref_age_max: p.pref_age_max,
    pref_marital: p.pref_marital,
    pref_education: p.pref_education,
    pref_profession: p.pref_profession,
    pref_income_min_pkr: p.pref_income_min_pkr,
    pref_income_max_pkr: p.pref_income_max_pkr,
    preferred_cities: p.preferred_cities,
    income_band: incomeBandLabel(p.monthly_income_pkr),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Dashboard: the viewer's compatible profiles, ranked. Scores use the full rows on the server only. */
export async function getMatches(me: Profile, limit = 100): Promise<{ profile: PublicProfile; percent: number }[]> {
  if (!(await allow("matches", me.id, 120, 3600))) return [];
  const { data } = await createAdminClient().rpc("match_candidates_for", { p_user: me.id, p_limit: limit });
  return rankMatches(me, (data as Profile[]) ?? []).map((m) => ({
    profile: toPublicProfile(m.profile),
    percent: m.percent,
  }));
}

/** One member's profile page. "limited" = the viewer is opening profiles unusually fast (scraping guard). */
export async function getProfileForViewer(
  me: Profile,
  id: string
): Promise<{ profile: PublicProfile; percent: number } | null | "limited"> {
  if (!UUID.test(id)) return null;
  if (!(await allow("profile-view", me.id, 300, 3600))) return "limited";
  const { data } = await createAdminClient()
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("status", "verified")
    .eq("role", "member")
    .maybeSingle();
  const row = data as Profile | null;
  if (!row) return null;
  return { profile: toPublicProfile(row), percent: scoreMatch(me, row).percent };
}

/** The viewer's shortlist (the ids come from the viewer's own shortlist rows). */
export async function getShortlisted(ids: string[]): Promise<PublicProfile[]> {
  if (ids.length === 0) return [];
  const { data } = await createAdminClient()
    .from("profiles")
    .select("*")
    .in("id", ids.slice(0, 200))
    .eq("status", "verified")
    .eq("role", "member");
  const byId = new Map(((data ?? []) as Profile[]).map((p) => [p.id, toPublicProfile(p)]));
  return ids.map((id) => byId.get(id)).filter((p): p is PublicProfile => !!p);
}

/** Display names for people the viewer already has a conversation / photo request with. */
export async function getDisplayNames(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = Array.from(new Set(ids)).filter((i) => UUID.test(i)).slice(0, 200);
  if (unique.length === 0) return out;
  const { data } = await createAdminClient().from("profiles").select("id, full_name").in("id", unique);
  for (const r of data ?? []) out.set(r.id as string, r.full_name as string);
  return out;
}
