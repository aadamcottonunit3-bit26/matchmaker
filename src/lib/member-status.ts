import type { Profile } from "@/lib/types";

export type StatusTone = "amber" | "green" | "orange" | "red";

/** Human status shown on member cards (a verified member whose plan ended counts as expired). */
export function memberStatus(p: Pick<Profile, "status" | "valid_until">): { label: string; tone: StatusTone } {
  const lapsed = p.status === "verified" && !!p.valid_until && new Date(p.valid_until) <= new Date();
  if (p.status === "pending") return { label: "Under process", tone: "amber" };
  if (p.status === "banned") return { label: "Banned", tone: "red" };
  if (p.status === "rejected") return { label: "Rejected", tone: "red" };
  if (p.status === "expired" || lapsed) return { label: "Expired", tone: "orange" };
  return { label: "Active", tone: "green" };
}

export const statusPillClass: Record<StatusTone, string> = {
  amber: "bg-amber-100 text-amber-800",
  green: "bg-emerald-100 text-emerald-700",
  orange: "bg-orange-100 text-orange-700",
  red: "bg-red-100 text-red-700",
};

/** 42401-1153697-3  ->  42401-*******-3 */
export function maskCnic(c: string | null | undefined) {
  if (!c) return "—";
  return c.replace(/^(\d{5})-(\d{7})-(\d)$/, "$1-*******-$3");
}
