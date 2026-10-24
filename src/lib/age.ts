/**
 * Age utilities. All calculations are done on calendar dates (no timezone drift):
 * DOB strings are "YYYY-MM-DD" and parsed as local date parts.
 */

function parseDob(dob: string | Date): { y: number; m: number; d: number } {
  if (dob instanceof Date) {
    return { y: dob.getFullYear(), m: dob.getMonth() + 1, d: dob.getDate() };
  }
  const [y, m, d] = dob.split("-").map(Number);
  return { y, m, d };
}

/** Completed years on the given date (defaults to today). */
export function calcAge(dob: string | Date, on: Date = new Date()): number {
  const { y, m, d } = parseDob(dob);
  let age = on.getFullYear() - y;
  const hadBirthday =
    on.getMonth() + 1 > m || (on.getMonth() + 1 === m && on.getDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}

/** Age the person will be on their next birthday. */
export function nextBirthdayAge(dob: string | Date, on: Date = new Date()): number {
  return calcAge(dob, on) + 1;
}

/** e.g. "28 Years (Turning 29 on next birthday)" */
export function ageLabel(dob: string | Date, on: Date = new Date()): string {
  const age = calcAge(dob, on);
  return `${age} Years (Turning ${age + 1} on next birthday)`;
}

/** Minimum DOB allowed for registration (18+). Use for <input type="date" max=...> */
export function maxDobForAdult(on: Date = new Date()): string {
  const d = new Date(on.getFullYear() - 18, on.getMonth(), on.getDate());
  return d.toISOString().slice(0, 10);
}
