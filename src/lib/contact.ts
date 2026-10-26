/** Contact details come from environment variables so you can change them without touching code. */
export function whatsappDigits(): string | null {
  const raw = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  if (!raw) return null;
  return raw.startsWith("0") ? `92${raw.slice(1)}` : raw;
}

export function contactPhone(): string | null {
  const p = (process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "").trim();
  return p || null;
}

/** Normalises a Pakistani mobile number for wa.me / tel: links. Returns null if it is not usable. */
export function toIntlDigits(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  if (d.startsWith("92")) return d;
  if (d.startsWith("0")) return `92${d.slice(1)}`;
  return d;
}
