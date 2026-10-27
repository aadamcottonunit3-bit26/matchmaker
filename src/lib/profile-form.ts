import "server-only";
import { profileFieldsSchema, numOrNull, readLifestyle, strOrNull } from "@/lib/validators";
import { incomeRangeFromValue } from "@/lib/income";
import {
  BODY_TYPES, LIFESTYLE_FIELDS, MARRIAGE_TIMELINE, MOTHER_TONGUES, PERSONALITY_TRAITS, SECTS, SKIN_TONES,
} from "@/lib/constants";

const keys = LIFESTYLE_FIELDS.map((f) => f.key);

/** Returns the value only if it is one of the allowed options, otherwise null. */
function pick(list: { value: string }[], raw: string | null) {
  return raw && list.some((o) => o.value === raw) ? raw : null;
}

/** Parses the shared ProfileFields form section. Returns either an error string or DB-ready values. */
export function parseProfileForm(fd: FormData):
  | { error: string }
  | { values: Record<string, unknown>; dob: string } {
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
    return { error: "Please choose a valid height." };
  }

  // Number of children is required for anyone who is not single ("No children" = 0).
  let children_count: number | null = null;
  if (parsed.data.marital_status !== "single") {
    const c = numOrNull(fd.get("children_count"));
    if (c === null || !Number.isInteger(c) || c < 0 || c > 20) {
      return { error: "Please select the number of children (or “No children”)." };
    }
    children_count = c;
  }

  const weight_kg = numOrNull(fd.get("weight_kg"));
  if (weight_kg !== null && (!Number.isInteger(weight_kg) || weight_kg < 30 || weight_kg > 250)) {
    return { error: "Weight must be between 30 and 250 kg." };
  }

  const personality = Array.from(new Set(fd.getAll("personality").map(String))).filter((v) =>
    PERSONALITY_TRAITS.some((o) => o.value === v)
  );
  if (personality.length > 3) return { error: "Choose up to 3 personality traits." };
  const hobbies = strOrNull(fd.get("hobbies"));
  const incomeRange = incomeRangeFromValue(strOrNull(fd.get("pref_income_range")));

  const pref_marital = fd.getAll("pref_marital").map(String);
  if (pref_marital.length === 0) return { error: "Select at least one accepted marital status." };

  const city = parsed.data.city;
  const preferred = Array.from(new Set([city, ...fd.getAll("preferred_cities").map(String)]));

  const { dob, ...profileData } = parsed.data;
  return {
    dob,
    values: {
      ...profileData,
      preferred_cities: preferred,
      pref_marital,
      education: strOrNull(fd.get("education")),
      profession: strOrNull(fd.get("profession")),
      monthly_income_pkr: numOrNull(fd.get("monthly_income_pkr")),
      family_background: strOrNull(fd.get("family_background")),
      about: strOrNull(fd.get("about")),
      height_cm: heightRaw,
      children_count,
      weight_kg,
      body_type: pick(BODY_TYPES, strOrNull(fd.get("body_type"))),
      skin_tone: pick(SKIN_TONES, strOrNull(fd.get("skin_tone"))),
      mother_tongue: pick(MOTHER_TONGUES, strOrNull(fd.get("mother_tongue"))),
      hobbies: hobbies ? hobbies.slice(0, 200) : null,
      personality,
      sect,
      marriage_timeline,
      lifestyle: readLifestyle(fd, "life", keys),
      pref_education: strOrNull(fd.get("pref_education")),
      pref_profession: strOrNull(fd.get("pref_profession")),
      pref_income_min_pkr: incomeRange?.min ?? null,
      pref_income_max_pkr: incomeRange?.max ?? null,
      pref_family: strOrNull(fd.get("pref_family")),
      pref_lifestyle: readLifestyle(fd, "prefl", keys),
    },
  };
}
