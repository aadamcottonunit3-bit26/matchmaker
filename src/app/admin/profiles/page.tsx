import Link from "next/link";
import { Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadPrivate } from "@/lib/admin-members";
import { cn } from "@/lib/utils";
import { AdminMemberCard } from "@/components/admin/AdminMemberCard";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Admin · Members" };

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Under process" },
  { key: "verified", label: "Active" },
  { key: "expired", label: "Expired" },
  { key: "banned", label: "Banned" },
];

const LIMIT = 100;

export default async function AdminProfiles({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab: rawTab, q } = await searchParams;
  const tab = TABS.some((t) => t.key === rawTab) ? rawTab! : "all";
  const search = (q ?? "").replace(/[%,()*\\]/g, "").trim().slice(0, 60);
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  function base(select: string, head = false) {
    return supabase.from("profiles").select(select, head ? { count: "exact", head: true } : { count: "exact" }).eq("role", "member");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyTab<T extends { eq: (...a: any[]) => any; or: (...a: any[]) => any }>(query: T, key: string): T {
    if (key === "pending") return query.eq("status", "pending");
    if (key === "verified") return query.eq("status", "verified").or(`valid_until.is.null,valid_until.gt.${nowIso}`);
    if (key === "banned") return query.eq("status", "banned");
    if (key === "expired") return query.or(`status.eq.expired,and(status.eq.verified,valid_until.lt.${nowIso})`);
    return query;
  }

  const counts = await Promise.all(
    TABS.map(async (t) => {
      const { count } = await applyTab(base("id", true), t.key);
      return count ?? 0;
    })
  );

  // Search by name, registration no, CNIC or mobile. We first collect matching ids, then filter by them.
  let searchIds: string[] | null = null;
  if (search) {
    const [byProfile, byPrivate] = await Promise.all([
      supabase.from("profiles").select("id").eq("role", "member").or(`full_name.ilike.%${search}%,reg_no.ilike.%${search}%`).limit(300),
      supabase.from("profile_private").select("profile_id").or(`cnic_number.ilike.%${search}%,phone.ilike.%${search}%`).limit(300),
    ]);
    searchIds = Array.from(
      new Set([...(byProfile.data ?? []).map((r) => r.id as string), ...(byPrivate.data ?? []).map((r) => r.profile_id as string)])
    );
  }

  let rows: Profile[] = [];
  let total = 0;
  if (searchIds === null || searchIds.length > 0) {
    let listQuery = applyTab(base("*"), tab).order("created_at", { ascending: false }).limit(LIMIT);
    if (searchIds) listQuery = listQuery.in("id", searchIds);
    const { data, count } = await listQuery;
    rows = (data ?? []) as unknown as Profile[];
    total = count ?? rows.length;
  }
  const priv = await loadPrivate(supabase, rows.map((r) => r.id));

  const href = (key: string) => `/admin/profiles?tab=${key}${search ? `&q=${encodeURIComponent(search)}` : ""}`;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <h1 className="mb-4 text-2xl font-bold text-stone-900">Members Management</h1>

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {TABS.map((t, i) => (
          <Link
            key={t.key}
            href={href(t.key)}
            className={cn(
              "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-teal-900 bg-teal-900 text-white"
                : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
            )}
          >
            {t.label}
            <span className={cn("rounded-full px-2 py-0.5 text-xs", tab === t.key ? "bg-white/20" : "bg-stone-100 text-stone-600")}>
              {counts[i]}
            </span>
          </Link>
        ))}
      </div>

      <form className="mb-5 flex gap-2">
        <input type="hidden" name="tab" value={tab} />
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
          <input
            name="q"
            defaultValue={search}
            placeholder="Search by name, CNIC, mobile, registration no…"
            className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-3 text-sm focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>
        <button className="rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900">Search</button>
        {search && (
          <Link href={`/admin/profiles?tab=${tab}`} aria-label="Clear search" className="flex items-center rounded-xl bg-stone-200 px-3 text-stone-700 hover:bg-stone-300">
            <X className="h-5 w-5" />
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-stone-500">
          No members found{search ? ` for “${search}”` : " in this list"}.
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-stone-500">
            Showing {rows.length}{total > rows.length ? ` of ${total}` : ""} member{rows.length > 1 ? "s" : ""}
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {rows.map((p) => (
              <AdminMemberCard key={p.id} p={p} priv={priv.get(p.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
