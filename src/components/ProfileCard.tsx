import Link from "next/link";
import { BadgeCheck, MapPin, Briefcase, GraduationCap, Lock } from "lucide-react";
import { Badge } from "@/components/ui";
import { calcAge } from "@/lib/age";
import { labelize } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export function ProfilePhoto({ profile, className }: { profile: Pick<Profile, "id" | "full_name">; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/photos/${profile.id}`}
      alt={`Photo of ${profile.full_name}`}
      className={className ?? "h-full w-full object-cover"}
      loading="lazy"
    />
  );
}

export function ProfileCard({ profile, percent }: { profile: Profile; percent?: number }) {
  return (
    <Link
      href={`/profile/${profile.id}`}
      className="group overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-stone-100">
        <ProfilePhoto profile={profile} />
        {profile.blur_photo && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            <Lock className="h-3 w-3" /> Private photo
          </span>
        )}
        {percent !== undefined && (
          <span className="absolute right-2 top-2 rounded-full bg-rose-700 px-3 py-1 text-sm font-bold text-white shadow">
            {percent}% match
          </span>
        )}
      </div>
      <div className="space-y-1.5 p-4">
        <h3 className="flex items-center gap-1.5 font-semibold text-stone-900 group-hover:text-rose-700">
          {profile.full_name}
          {profile.is_verified && <BadgeCheck className="h-5 w-5 text-emerald-600" aria-label="Verified" />}
        </h3>
        <p className="text-sm text-stone-600">
          {calcAge(profile.dob)} yrs · {labelize(profile.marital_status)}
        </p>
        <p className="flex items-center gap-1.5 text-sm text-stone-600"><MapPin className="h-4 w-4" />{profile.city}</p>
        {profile.profession && <p className="flex items-center gap-1.5 text-sm text-stone-600"><Briefcase className="h-4 w-4" />{profile.profession}</p>}
        {profile.education && <p className="flex items-center gap-1.5 text-sm text-stone-600"><GraduationCap className="h-4 w-4" />{labelize(profile.education)}</p>}
        <div className="pt-1">
          <Badge tone="gray">View profile</Badge>
        </div>
      </div>
    </Link>
  );
}
