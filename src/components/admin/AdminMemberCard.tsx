import Link from "next/link";
import { BadgeCheck, Calendar, Hash, MessageCircle, Phone } from "lucide-react";
import { formatDay, cn, labelize } from "@/lib/utils";
import { toIntlDigits } from "@/lib/contact";
import { maskCnic, memberStatus, statusPillClass } from "@/lib/member-status";
import type { Profile } from "@/lib/types";

export type MemberPrivate = { cnic_number?: string | null; phone?: string | null };

/** Member card used in the admin panel (photo, name, CNIC, status, reg no, phone, date, actions). */
export function AdminMemberCard({
  p,
  priv,
}: {
  p: Pick<Profile, "id" | "full_name" | "gender" | "is_verified" | "status" | "valid_until" | "created_at" | "reg_no">;
  priv?: MemberPrivate;
}) {
  const status = memberStatus(p);
  const phone = priv?.phone ?? null;
  const wa = toIntlDigits(phone);
  const btn = "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors";

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/photos/${p.id}`}
          alt=""
          loading="lazy"
          className="h-14 w-14 shrink-0 rounded-full bg-stone-200 object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-base font-bold text-stone-900">
            <span className="truncate">{p.full_name}</span>
            {p.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Verified" />}
          </p>
          <p className="truncate font-mono text-xs text-stone-500">
            {maskCnic(priv?.cnic_number)} <span className="font-sans">· {labelize(p.gender)}</span>
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide",
            statusPillClass[status.tone]
          )}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-y border-dashed border-stone-200 py-2.5 text-sm text-stone-600">
        <span className="flex items-center gap-1.5"><Hash className="h-4 w-4 text-teal-700" />{p.reg_no ?? "—"}</span>
        <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-teal-700" />{phone ?? "—"}</span>
        <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-teal-700" />{formatDay(p.created_at)}</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {phone ? (
          <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className={cn(btn, "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100")}>
            <Phone className="h-4 w-4" /> Call
          </a>
        ) : (
          <span className={cn(btn, "cursor-not-allowed border-stone-200 bg-stone-50 text-stone-400")}><Phone className="h-4 w-4" /> Call</span>
        )}
        {wa ? (
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className={cn(btn, "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100")}>
            <MessageCircle className="h-4 w-4" /> Chat
          </a>
        ) : (
          <span className={cn(btn, "cursor-not-allowed border-stone-200 bg-stone-50 text-stone-400")}><MessageCircle className="h-4 w-4" /> Chat</span>
        )}
        <Link href={`/admin/profiles/${p.id}`} className={cn(btn, "border-teal-800 bg-teal-800 text-white hover:bg-teal-900")}>
          {p.status === "pending" ? "Review" : "Open"}
        </Link>
      </div>
    </div>
  );
}
