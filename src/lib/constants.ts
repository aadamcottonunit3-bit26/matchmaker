export const CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar",
  "Quetta", "Hyderabad", "Sialkot", "Gujranwala", "Bahawalpur", "Sargodha", "Sukkur",
  "Larkana", "Mardan", "Abbottabad", "Gujrat", "Sahiwal", "Rahim Yar Khan",
];

export const EDUCATION = [
  { value: "matric", label: "Matric" },
  { value: "intermediate", label: "Intermediate" },
  { value: "bachelors", label: "Bachelors" },
  { value: "masters", label: "Masters" },
  { value: "mphil", label: "MPhil" },
  { value: "phd", label: "PhD" },
];

export const FAMILY_BACKGROUND = [
  { value: "lower_middle", label: "Lower Middle" },
  { value: "middle", label: "Middle" },
  { value: "upper_middle", label: "Upper Middle" },
  { value: "upper", label: "Upper" },
];

export const MARITAL = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widow", label: "Widow" },
];

export const LIFESTYLE_FIELDS: { key: string; label: string; options: string[] }[] = [
  { key: "smoking", label: "Smoking", options: ["no", "occasionally", "yes"] },
  { key: "prayer", label: "Prayer", options: ["regular", "sometimes", "rarely"] },
  { key: "diet", label: "Diet", options: ["halal_only", "vegetarian", "no_preference"] },
  { key: "living", label: "Living arrangement", options: ["joint_family", "separate"] },
];

export const PAYMENT_METHODS = [
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "EasyPaisa" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

/** Where members send money. Move to a CMS setting if you want admins to edit it. */
export const PAYMENT_ACCOUNTS = [
  { method: "JazzCash", detail: "03XX-XXXXXXX (Account title: Your Bureau Name)" },
  { method: "EasyPaisa", detail: "03XX-XXXXXXX (Account title: Your Bureau Name)" },
  { method: "Bank Transfer", detail: "Bank / IBAN: PKXX XXXX XXXX XXXX XXXX XXXX" },
];

export const SECTS = [
  { value: "sunni", label: "Sunni" },
  { value: "shia", label: "Shia" },
  { value: "other", label: "Other" },
];

export const MARRIAGE_TIMELINE = [
  { value: "asap", label: "As soon as possible" },
  { value: "within_6_months", label: "Within 6 months" },
  { value: "within_1_year", label: "Within 1 year" },
  { value: "no_hurry", label: "No hurry" },
];

export const REPORT_REASONS = [
  { value: "fake_profile", label: "Fake profile / false information" },
  { value: "abusive", label: "Abusive or disrespectful behaviour" },
  { value: "scam", label: "Asking for money / scam" },
  { value: "inappropriate_photo", label: "Inappropriate photo" },
  { value: "other", label: "Other" },
];
