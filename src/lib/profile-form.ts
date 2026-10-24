import "server-only";
import { profileFieldsSchema, numOrNull, readLifestyle, strOrNull } from "@/lib/validators";
import { LIFESTYLE_FIELDS, MARRIAGE_TIMELINE, SECTS } from "@/lib/constants";

const keys = LIFESTYLE_FIELDS.map((f) => f.key);

/** Parses the shared ProfileFields form section. Returns either an error string or DB-ready values. */
export function parseProfileForm(fd: FormData):
  | { error: string }
  | { values: Record<string, unknown> } {
  const parsed = profileFieldsSchema.safeParse({
    full_name: fd.get("full_name"),
    gender: fd.get("gender"),
    marital_status: fd.get("marital_status"),
    dob: fd.get("dob"),
    city: fd.get("city"),
    pref_age_min: Number(fd.get("pref_age_min")),
    pref_age_max: Number(fd.get("pref_age_max")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Optional extras: only accept known values / sensible ranges.
  const sectRaw = strOrNull(fd.get("sect"));
  const sect = SECTS.some((o) => o.value === sectRaw) ? sectRaw : null;
  const timelineRaw = strOrNull(fd.get("marriage_timeline"));
  const marriage_timeline = MARRIAGE_TIMELINE.some((o) => o.value === timelineRaw) ? timelineRaw : null;
  const heightRaw = numOrNull(fd.get("height_cm"));
  if (heightRaw !== null && (!Number.isInteger(heightRaw) || heightRaw < 120 || heightRaw > 230)) {
    return { error: "Height must be between 120 and 230 cm." };
  }

  const pref_marital = fd.getAll("pref_marital").map(String);
  if (pref_marital.length === 0) return { error: "Select at least one accepted marital status." };

  const city = parsed.data.city;
  const preferred = Array.from(new Set([city, ...fd.getAll("preferred_cities").map(String)]));

  return {
    values: {
      ...parsed.data,
      preferred_cities: preferred,
      pref_marital,
      education: strOrNull(fd.get("education")),
      profession: strOrNull(fd.get("profession")),
      monthly_income_pkr: numOrNull(fd.get("monthly_income_pkr")),
      family_background: strOrNull(fd.get("family_background")),
      about: strOrNull(fd.get("about")),
      height_cm: heightRaw,
      sect,
      marriage_timeline,
      lifestyle: readLifestyle(fd, "life", keys),
      pref_education: strOrNull(fd.get("pref_education")),
      pref_profession: strOrNull(fd.get("pref_profession")),
      pref_income_min_pkr: numOrNull(fd.get("pref_income_min_pkr")),
      pref_family: strOrNull(fd.get("pref_family")),
      pref_lifestyle: readLifestyle(fd, "prefl", keys),
    },
  };
}
