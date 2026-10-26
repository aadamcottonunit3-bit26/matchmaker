import { BadgeCheck, CalendarDays, Hash, MapPin } from "lucide-react";
import { requireMe } from "@/lib/auth";
import { ageLabel } from "@/lib/age";
import { formatDay, cn } from "@/lib/utils";
import { memberStatus, statusPillClass } from "@/lib/member-status";
import { PageContainer } from "@/components/ui";
import { EditForm } from "./EditForm";

export const metadata = { title: "My profile" };

export default async function MyProfilePage() {
  const me = await requireMe();
  const status = memberStatus(me);
  return (
    <PageContainer className="max-w-3xl">
      {/* Member card: same pattern as the admin members list */}
      <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/photos/${me.id}`} alt="" className="h-16 w-16 shrink-0 rounded-full bg-stone-200 object-cover sm:h-20 sm:w-20" />
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-1.5 text-xl font-bold text-stone-900 sm:text-2xl">
              <span className="truncate">{me.full_name}</span>
              {me.is_verified && <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Verified" />}
            </h1>
            <p className="text-sm text-stone-600">{ageLabel(me.dob)}</p>
          </div>
          <span className={cn("shrink-0 rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide", statusPillClass[status.tone])}>
            {status.label}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-dashed border-stone-200 pt-3 text-sm text-stone-600">
          <span className="flex items-center gap-1.5"><Hash className="h-4 w-4 text-rose-700" />{me.reg_no ?? "—"}</span>
          <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-rose-700" />{me.city}</span>
          {me.valid_until && (
            <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-rose-700" />Valid until {formatDay(me.valid_until)}</span>
          )}
        </div>
      </div>
      <EditForm profile={me} />
    </PageContainer>
  );
}
