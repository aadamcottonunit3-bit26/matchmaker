import Link from "next/link";
import { cn } from "@/lib/utils";

const tones = {
  teal: "bg-teal-50 text-teal-700",
  amber: "bg-amber-50 text-amber-600",
  green: "bg-emerald-50 text-emerald-600",
  orange: "bg-orange-50 text-orange-600",
  red: "bg-red-50 text-red-600",
  blue: "bg-sky-50 text-sky-600",
  purple: "bg-violet-50 text-violet-600",
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "teal",
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  tone?: keyof typeof tones;
  href?: string;
}) {
  const body = (
    <div className="flex h-full items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
        <Icon className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xl font-bold text-stone-900 sm:text-2xl">{value}</p>
        <p className="truncate text-xs text-stone-500 sm:text-sm">{label}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
