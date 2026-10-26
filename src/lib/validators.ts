import { z } from "zod";

export const CNIC_REGEX = /^\d{5}-\d{7}-\d$/;

export const strOrNull = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

export const numOrNull = (v: FormDataEntryValue | null) => {
  const s = strOrNull(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export function isAdult(dob: string) {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return false;
  const limit = new Date();
  limit.setFullYear(limit.getFullYear() - 18);
  return d <= limit;
}

export const profileFieldsSchema = z.object({
  full_name: z.string().trim().min(3, "Please enter your full name."),
  gender: z.enum(["male", "female"], { message: "Select your gender." }),
  marital_status: z.enum(["single", "married", "divorced", "widow"], { message: "Select marital status." }),
  dob: z.string().refine(isAdult, "You must be at least 18 years old."),
  city: z.string().trim().min(2, "Select your city."),
  pref_age_min: z.number().int().min(18, "Minimum preferred age is 18."),
  pref_age_max: z.number().int().max(90, "Maximum preferred age is 90."),
}).refine((v) => v.pref_age_max >= v.pref_age_min, {
  message: "Preferred age maximum must be at least the minimum.",
  path: ["pref_age_max"],
});

/** Collect lifestyle selections from form fields named `${prefix}_${key}`. */
export function readLifestyle(fd: FormData, prefix: string, keys: string[]) {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = strOrNull(fd.get(`${prefix}_${k}`));
    if (v) out[k] = v;
  }
  return out;
}
