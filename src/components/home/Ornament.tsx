import { cn } from "@/lib/utils";

/** Two interlocked wedding rings with a diamond. */
export function RingsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={className} aria-hidden>
      <circle cx="23" cy="39" r="15" />
      <circle cx="41" cy="39" r="15" />
      <path d="M32 5 37 11 32 17 27 11Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Gold line with a small star in the middle. */
export function OrnamentDivider({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <div className={cn("flex items-center justify-center gap-3", light ? "text-amber-300" : "text-amber-500", className)} aria-hidden>
      <span className="h-px w-14 bg-gradient-to-r from-transparent to-current sm:w-20" />
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
        <path d="M12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9Z" />
      </svg>
      <span className="h-px w-14 bg-gradient-to-l from-transparent to-current sm:w-20" />
    </div>
  );
}

/** Section title: small gold eyebrow, serif heading, ornament. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("mb-8", align === "center" && "text-center")}>
      {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">{eyebrow}</p>}
      <h2 className="font-serif text-2xl font-bold text-rose-950 sm:text-3xl">{title}</h2>
      {subtitle && <p className={cn("mt-2 text-stone-600", align === "center" && "mx-auto max-w-2xl")}>{subtitle}</p>}
      <OrnamentDivider className={cn("mt-4", align === "left" && "justify-start")} />
    </div>
  );
}
