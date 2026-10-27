"use client";

import { useState } from "react";
import { ageLabel, maxDobForAdult } from "@/lib/age";
import {
  BODY_TYPES,
  CHILDREN_OPTIONS,
  CITIES,
  EDUCATION,
  FAMILY_BACKGROUND,
  LIFESTYLE_FIELDS,
  MARITAL,
  MARRIAGE_TIMELINE,
  MOTHER_TONGUES,
  PERSONALITY_TRAITS,
  SECTS,
  SKIN_TONES,
} from "@/lib/constants";
import { HEIGHT_OPTIONS, heightOptionValue } from "@/lib/height";
import { INCOME_RANGES, incomeRangeValue } from "@/lib/income";
import type { Profile } from "@/lib/types";
import { Card, Field, Input, Select, Textarea } from "@/components/ui";
import { cn, labelize } from "@/lib/utils";

const cityOptions = CITIES.map((c) => ({ value: c, label: c }));

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-stone-900">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

function CheckGroup({
  name,
  options,
  defaults,
}: {
  name: string;
  options: { value: string; label: string }[];
  defaults: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label
          key={o.value}
          className="flex cursor-pointer items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm has-[:checked]:border-rose-600 has-[:checked]:bg-rose-50"
        >
          <input type="checkbox" name={name} value={o.value} defaultChecked={defaults.includes(o.value)} className="accent-rose-700" />
          {o.label}
        </label>
      ))}
    </div>
  );
}

/** Pick up to 3 personality traits (the rest are disabled once 3 are chosen). */
function TraitPicker({ defaults }: { defaults: string[] }) {
  const [picked, setPicked] = useState<string[]>(defaults);
  return (
    <div className="flex flex-wrap gap-2">
      {PERSONALITY_TRAITS.map((o) => {
        const checked = picked.includes(o.value);
        const locked = !checked && picked.length >= 3;
        return (
          <label
            key={o.value}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
              checked ? "border-rose-600 bg-rose-50" : "border-stone-300 bg-white",
              locked ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            )}
          >
            <input
              type="checkbox"
              name="personality"
              value={o.value}
              checked={checked}
              disabled={locked}
              onChange={(e) =>
                setPicked((prev) => (e.target.checked ? [...prev, o.value] : prev.filter((v) => v !== o.value)))
              }
              className="accent-rose-700"
            />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}

export type ProfileDefaults = Partial<Profile> & { dob?: string | null };

export function ProfileFields({ defaults }: { defaults?: ProfileDefaults }) {
  const d = defaults ?? {};
  const [dob, setDob] = useState(d.dob ?? "");
  const validDob = /^\d{4}-\d{2}-\d{2}$/.test(dob);
  const [marital, setMarital] = useState<string>(d.marital_status ?? "");
  const showChildren = marital !== "" && marital !== "single";

  return (
    <>
      <Section title="About you">
        <Field label="Full name">
          <Input name="full_name" defaultValue={d.full_name} required minLength={3} />
        </Field>
        <Field label="Gender">
          <Select
            name="gender"
            defaultValue={d.gender ?? ""}
            required
            placeholder="Select…"
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ]}
          />
        </Field>
        <div className="space-y-4">
          <Field label="Marital status">
            <Select
              name="marital_status"
              defaultValue={d.marital_status ?? ""}
              required
              placeholder="Select…"
              options={MARITAL}
              onChange={(e) => setMarital(e.target.value)}
            />
          </Field>
          {showChildren && (
            <Field label="Number of children">
              <Select
                name="children_count"
                required
                defaultValue={d.children_count != null ? String(d.children_count) : ""}
                placeholder="Select…"
                options={CHILDREN_OPTIONS}
              />
            </Field>
          )}
        </div>
        <Field label="Date of birth">
          <Input
            name="dob"
            type="date"
            required
            max={maxDobForAdult()}
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
          {validDob && (
            <p className="mt-1.5 rounded-md bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-800">
              {ageLabel(dob)}
            </p>
          )}
        </Field>
        <Field label="City">
          <Select name="city" defaultValue={d.city ?? ""} required placeholder="Select city…" options={cityOptions} />
        </Field>
        <Field label="Education">
          <Select name="education" defaultValue={d.education ?? ""} placeholder="Select…" options={EDUCATION} />
        </Field>
        <Field label="Profession">
          <Input name="profession" defaultValue={d.profession ?? ""} placeholder="e.g. Engineer, Teacher, Doctor" />
        </Field>
        <Field label="Monthly income (PKR)">
          <Input name="monthly_income_pkr" type="number" min={0} step={1000} defaultValue={d.monthly_income_pkr ?? ""} />
        </Field>
        <Field label="Family background">
          <Select name="family_background" defaultValue={d.family_background ?? ""} placeholder="Select…" options={FAMILY_BACKGROUND} />
        </Field>
        <Field label="Sect" hint="Optional.">
          <Select name="sect" defaultValue={d.sect ?? ""} placeholder="Prefer not to say" options={SECTS} />
        </Field>
        <Field label="When do you want to marry?" hint="Optional.">
          <Select name="marriage_timeline" defaultValue={d.marriage_timeline ?? ""} placeholder="Select…" options={MARRIAGE_TIMELINE} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="About me">
            <Textarea name="about" defaultValue={d.about ?? ""} maxLength={1500} placeholder="Describe yourself, your family and what you value." />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-medium text-stone-700">Lifestyle</p>
          <div className="grid gap-3 sm:grid-cols-4">
            {LIFESTYLE_FIELDS.map((f) => (
              <Field key={f.key} label={f.label}>
                <Select
                  name={`life_${f.key}`}
                  defaultValue={d.lifestyle?.[f.key] ?? ""}
                  placeholder="—"
                  options={f.options.map((o) => ({ value: o, label: labelize(o) }))}
                />
              </Field>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Personal details">
        <Field label="Height" hint="Feet and inches.">
          <Select name="height_cm" defaultValue={heightOptionValue(d.height_cm)} placeholder="Select…" options={HEIGHT_OPTIONS} />
        </Field>
        <Field label="Weight (kg)" hint="Optional. Example: 70">
          <Input name="weight_kg" type="number" min={30} max={250} step={1} inputMode="numeric" defaultValue={d.weight_kg ?? ""} />
        </Field>
        <Field label="Body type">
          <Select name="body_type" defaultValue={d.body_type ?? ""} placeholder="Select…" options={BODY_TYPES} />
        </Field>
        <Field label="Skin tone">
          <Select name="skin_tone" defaultValue={d.skin_tone ?? ""} placeholder="Select…" options={SKIN_TONES} />
        </Field>
        <Field label="Mother tongue">
          <Select name="mother_tongue" defaultValue={d.mother_tongue ?? ""} placeholder="Select…" options={MOTHER_TONGUES} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Hobbies & interests" hint="Optional.">
            <Input name="hobbies" maxLength={200} defaultValue={d.hobbies ?? ""} placeholder="e.g. Reading, cricket, cooking, travel" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-medium text-stone-700">How would you describe yourself? (choose up to 3)</p>
          <TraitPicker defaults={d.personality ?? []} />
        </div>
      </Section>

      <Section title="Partner preferences">
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-medium text-stone-700">Preferred cities (your own city is always included)</p>
          <CheckGroup name="preferred_cities" options={cityOptions} defaults={d.preferred_cities ?? []} />
        </div>
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-medium text-stone-700">Accepted marital status</p>
          <CheckGroup name="pref_marital" options={MARITAL} defaults={d.pref_marital ?? ["single"]} />
        </div>
        <Field label="Preferred age — from">
          <Input name="pref_age_min" type="number" min={18} max={90} defaultValue={d.pref_age_min ?? 21} required />
        </Field>
        <Field label="Preferred age — to">
          <Input name="pref_age_max" type="number" min={18} max={90} defaultValue={d.pref_age_max ?? 35} required />
        </Field>
        <Field label="Preferred education">
          <Select name="pref_education" defaultValue={d.pref_education ?? ""} placeholder="No preference" options={EDUCATION} />
        </Field>
        <Field label="Preferred profession">
          <Input name="pref_profession" defaultValue={d.pref_profession ?? ""} placeholder="Leave empty for no preference" />
        </Field>
        <Field label="Monthly income required (PKR)">
          <Select
            name="pref_income_range"
            defaultValue={incomeRangeValue(d.pref_income_min_pkr, d.pref_income_max_pkr)}
            placeholder="No preference"
            options={INCOME_RANGES}
          />
        </Field>
        <Field label="Preferred family background">
          <Select name="pref_family" defaultValue={d.pref_family ?? ""} placeholder="No preference" options={FAMILY_BACKGROUND} />
        </Field>
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-medium text-stone-700">Preferred lifestyle</p>
          <div className="grid gap-3 sm:grid-cols-4">
            {LIFESTYLE_FIELDS.map((f) => (
              <Field key={f.key} label={f.label}>
                <Select
                  name={`prefl_${f.key}`}
                  defaultValue={d.pref_lifestyle?.[f.key] ?? ""}
                  placeholder="No preference"
                  options={f.options.map((o) => ({ value: o, label: labelize(o) }))}
                />
              </Field>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
