/** Income brackets for "monthly income required" in a partner (PKR per month). */
export const INCOME_RANGES: { value: string; label: string; min: number | null; max: number | null }[] = [
  { value: "0-100000", label: "Less than 100,000", min: null, max: 100000 },
  { value: "100000-150000", label: "100,000 to 150,000", min: 100000, max: 150000 },
  { value: "150000-200000", label: "150,000 to 200,000", min: 150000, max: 200000 },
  { value: "200000-300000", label: "200,000 to 300,000", min: 200000, max: 300000 },
  { value: "300000-500000", label: "300,000 to 500,000", min: 300000, max: 500000 },
  { value: "500000-", label: "More than 500,000", min: 500000, max: null },
];

export function incomeRangeFromValue(value: string | null | undefined) {
  return INCOME_RANGES.find((r) => r.value === value) ?? null;
}

/** The dropdown value for stored min/max. Older profiles only have a minimum, so use the bracket it falls in. */
export function incomeRangeValue(min: number | null | undefined, max: number | null | undefined): string {
  const exact = INCOME_RANGES.find((r) => r.min === (min ?? null) && r.max === (max ?? null));
  if (exact) return exact.value;
  if (min && !max) {
    const inside = INCOME_RANGES.find((r) => r.min !== null && min >= r.min && (r.max === null || min < r.max));
    if (inside) return inside.value;
  }
  return "";
}

export function incomeRangeLabel(min: number | null | undefined, max: number | null | undefined): string | null {
  const v = incomeRangeValue(min, max);
  return v ? incomeRangeFromValue(v)!.label : null;
}

/** How well a candidate's income fits a wished-for bracket: 0..1 (neutral 0.5 when nothing was asked). */
export function incomeFit(
  wantMin: number | null | undefined,
  wantMax: number | null | undefined,
  income: number | null | undefined
): number {
  const hasMin = !!wantMin && wantMin > 0;
  const hasMax = !!wantMax && wantMax > 0;
  if (!hasMin && !hasMax) return 0.5;
  if (income == null) return 0.3;
  if (hasMin && income < wantMin!) return Math.min(1, income / wantMin!);
  if (hasMax && income > wantMax!) return 0.8; // earns more than asked: still a good fit, slightly lower
  return 1;
}

/** Other members see an income BAND, never the exact amount. */
export function incomeBandLabel(income: number | null | undefined): string | null {
  if (!income || income <= 0) return null;
  const r = INCOME_RANGES.find((x) => (x.min === null || income >= x.min) && (x.max === null || income < x.max));
  return r ? r.label : null;
}
