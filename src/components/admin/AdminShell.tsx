"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity, CreditCard, Flag, Globe, Heart, LayoutDashboard, LogOut, Menu, MessageSquare,
  ScrollText, Settings, UserCog, Users, X,
} from "lucide-react";
import { logout } from "@/app/(site)/login/actions";
import { cn } from "@/lib/utils";

type BadgeKey = "profiles" | "payments" | "reports";

const NAV: { href: string; label: string; icon: typeof Users; exact?: boolean; badge?: BadgeKey }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/profiles", label: "Members", icon: Users, badge: "profiles" },
  { href: "/admin/payments", label: "Payments", icon: CreditCard, badge: "payments" },
  { href: "/admin/reports", label: "Reports", icon: Flag, badge: "reports" },
  { href: "/admin/activity", label: "Activity", icon: Activity },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare },
  { href: "/admin/cms", label: "Setup", icon: Settings },
  { href: "/admin/audit", label: "Audit logs", icon: ScrollText },
];

export function AdminShell({
  adminName,
  badges,
  children,
}: {
  adminName: string;
  badges: Record<BadgeKey, number>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const brand = (
    <Link href="/admin" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
        <Heart className="h-5 w-5 fill-amber-300 text-amber-300" />
      </span>
      <span className="leading-tight">
        <span className="block text-base font-bold">Rishta Bureau</span>
        <span className="block text-xs text-teal-200">Admin panel</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-stone-100 lg:flex">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-teal-900 px-4 py-3 text-white lg:hidden">
        {brand}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 hover:bg-white/10"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-teal-900 text-white transition-transform duration-200",
          "lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:max-w-none lg:shrink-0 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          {brand}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(n.href + "/");
            const count = n.badge ? badges[n.badge] : 0;
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors",
                  active ? "bg-white/15 text-white" : "text-teal-100 hover:bg-white/10 hover:text-white"
                )}
              >
                <n.icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">{n.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-bold text-white",
                      n.badge === "profiles" ? "bg-amber-500" : "bg-red-500"
                    )}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-white/10 p-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-teal-100 hover:bg-white/10 hover:text-white"
          >
            <Globe className="h-5 w-5" /> View website
          </Link>
          <form action={logout}>
            <button className="flex w-full items-center gap-3 rounded-xl bg-white/10 px-3 py-3 text-[15px] font-medium text-white hover:bg-white/20">
              <LogOut className="h-5 w-5" /> Logout
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="hidden items-center justify-end border-b border-stone-200 bg-white px-8 py-3 lg:flex">
          <span className="flex items-center gap-2 rounded-full bg-teal-50 px-4 py-1.5 text-sm font-semibold text-teal-900">
            <UserCog className="h-4 w-4" /> {adminName || "Admin"}
          </span>
        </div>
        <main>{children}</main>
      </div>
    </div>
  );
}
