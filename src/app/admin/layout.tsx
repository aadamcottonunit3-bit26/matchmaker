import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const nav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/profiles", label: "Profiles" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/activity", label: "Activity" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/cms", label: "CMS" },
  { href: "/admin/audit", label: "Audit logs" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div>
      <div className="border-b border-stone-200 bg-stone-900">
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap px-3 py-3 text-sm text-stone-200 hover:bg-stone-800 hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
