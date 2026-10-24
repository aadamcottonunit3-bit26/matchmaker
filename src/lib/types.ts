export type Gender = "male" | "female";
export type MaritalStatus = "single" | "married" | "divorced" | "widow";
export type ProfileStatus = "pending" | "verified" | "banned" | "expired" | "rejected";

export interface Profile {
  id: string;
  role: "member" | "admin";
  status: ProfileStatus;
  is_verified: boolean;
  verified_at: string | null;
  reg_no: string | null;
  full_name: string;
  gender: Gender;
  marital_status: MaritalStatus;
  dob: string;
  city: string;
  preferred_cities: string[];
  education: string | null;
  profession: string | null;
  monthly_income_pkr: number | null;
  family_background: string | null;
  lifestyle: Record<string, string>;
  about: string | null;
  height_cm: number | null;
  sect: string | null;
  marriage_timeline: string | null;
  pref_age_min: number;
  pref_age_max: number;
  pref_marital: MaritalStatus[];
  pref_education: string | null;
  pref_profession: string | null;
  pref_income_min_pkr: number | null;
  pref_family: string | null;
  pref_lifestyle: Record<string, string>;
  photo_path: string | null;
  blur_photo: boolean;
  plan_id: string | null;
  valid_until: string | null;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  tier: "free" | "verified" | "vip";
  price_pkr: number;
  duration_days: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
}
