import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ---------- Button ---------- */
const buttonVariants = {
  primary: "bg-rose-700 text-white hover:bg-rose-800 disabled:bg-rose-300",
  secondary: "bg-stone-100 text-stone-900 hover:bg-stone-200 border border-stone-200",
  outline: "border border-rose-700 text-rose-700 hover:bg-rose-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
  ghost: "text-stone-700 hover:bg-stone-100",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

export function buttonClass(variant: ButtonVariant = "primary", size: "sm" | "md" | "lg" = "md") {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed",
    size === "sm" && "px-3 py-1.5 text-sm",
    size === "md" && "px-4 py-2.5 text-sm",
    size === "lg" && "px-6 py-3 text-base",
    buttonVariants[variant]
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
}) {
  return <button className={cn(buttonClass(variant, size), className)} {...props} />;
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(buttonClass(variant, size), className)}>
      {children}
    </Link>
  );
}

/* ---------- Form controls ---------- */
const field =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-200";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1 block text-sm font-medium text-stone-700", className)} {...props} />;
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, "min-h-24", className)} {...props} />;
}

export function Select({
  className,
  options,
  placeholder,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select className={cn(field, className)} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

/* ---------- Layout bits ---------- */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-xl border border-stone-200 bg-white p-5 shadow-sm", className)} {...props} />
  );
}

export function PageContainer({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 py-8 sm:px-6", className)} {...props} />;
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-stone-600">{subtitle}</p>}
    </div>
  );
}

const badgeTones = {
  gray: "bg-stone-100 text-stone-700",
  green: "bg-emerald-100 text-emerald-800",
  red: "bg-red-100 text-red-800",
  yellow: "bg-amber-100 text-amber-800",
  rose: "bg-rose-100 text-rose-800",
  blue: "bg-sky-100 text-sky-800",
} as const;

export function Badge({
  tone = "gray",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof badgeTones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        badgeTones[tone],
        className
      )}
      {...props}
    />
  );
}

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success" | "warn";
  children: React.ReactNode;
}) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    error: "border-red-200 bg-red-50 text-red-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
  };
  return <div className={cn("rounded-lg border px-4 py-3 text-sm", tones[tone])}>{children}</div>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center text-stone-500">
      {children}
    </div>
  );
}

/** Link-based tabs (server-rendered; state lives in ?tab=). */
export function TabNav({
  tabs,
  active,
  basePath,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  basePath: string;
}) {
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-stone-200">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={`${basePath}?tab=${t.key}`}
          className={cn(
            "whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium",
            active === t.key
              ? "border-rose-700 text-rose-700"
              : "border-transparent text-stone-600 hover:text-stone-900"
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">{t.count}</span>
          )}
        </Link>
      ))}
    </div>
  );
}

/** Responsive table wrapper. */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}
export const Th = ({ children }: { children?: React.ReactNode }) => (
  <th className="border-b border-stone-200 bg-stone-50 px-4 py-3 font-semibold text-stone-700">{children}</th>
);
export const Td = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <td className={cn("border-b border-stone-100 px-4 py-3 align-top", className)}>{children}</td>
);
