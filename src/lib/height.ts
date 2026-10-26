/** Height is stored in cm (height_cm) but members pick and see it in feet + inches. */
const CM_PER_INCH = 2.54;

function inchesToCm(inches: number) {
  return Math.round(inches * CM_PER_INCH);
}

/** 4′ 0″ … 7′ 0″ in one dropdown. value = cm (what the database stores). */
export const HEIGHT_OPTIONS = Array.from({ length: 37 }, (_, i) => {
  const inches = 48 + i;
  const cm = inchesToCm(inches);
  return { value: String(cm), label: `${Math.floor(inches / 12)}′ ${inches % 12}″ (${cm} cm)` };
});

/** "5′ 9″" for a stored cm value, or null when not set. */
export function formatHeight(cm: number | null | undefined): string | null {
  if (!cm) return null;
  const inches = Math.round(cm / CM_PER_INCH);
  return `${Math.floor(inches / 12)}′ ${inches % 12}″`;
}

/** The dropdown value that matches a stored cm value (nearest whole inch), or "". */
export function heightOptionValue(cm: number | null | undefined): string {
  if (!cm) return "";
  return String(inchesToCm(Math.round(cm / CM_PER_INCH)));
}
