import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { RingsIcon } from "@/components/home/Ornament";
import { getMe } from "@/lib/auth";
import { logout } from "@/app/(site)/login/actions";
import { buttonClass } from "@/components/ui";

export async function Header() {
  const me = await getMe();

  const links = me
    ? [
        { href: "/dashboard", label: "Matches" },
        { href: "/shortlist", label: "Shortlist" },
        { href: "/messages", label: "Messages" },
        { href: "/photo-requests", label: "Photo Requests" },
        { href: "/billing", label: "Plans" },
        { href: "/my-profile", label: "My Profile" },
        ...(me.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : [
        { href: "/pricing", label: "Pricing" },
        { href: "/about-us", label: "About" },
        { href: "/#faq", label: "FAQ" },
      ];

  return (
    <header className="sticky top-0 z-30 border-b-2 border-amber-300/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold text-rose-900">
          <RingsIcon className="h-7 w-7 text-amber-600" />
          Rishta Bureau
        </Link>

        <nav className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto text-sm sm:order-none sm:mx-0 sm:w-auto">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap rounded-md px-3 py-2 text-stone-700 hover:bg-stone-100"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {me ? (
            <>
              <span className="hidden items-center gap-1 text-sm text-stone-700 md:flex">
                {me.full_name}
                {me.is_verified && <BadgeCheck className="h-4 w-4 text-emerald-600" aria-label="Verified" />}
              </span>
              <form action={logout}>
                <button className={buttonClass("secondary", "sm")}>Logout</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={buttonClass("ghost", "sm")}>
                Login
              </Link>
              <Link href="/register" className={buttonClass("primary", "sm")}>
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
