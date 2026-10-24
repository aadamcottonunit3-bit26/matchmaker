import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { calcAge } from "@/lib/age";
import { formatDate, formatDay, labelize } from "@/lib/utils";
import { Badge, EmptyState, PageContainer, PageTitle, TabNav, TableWrap, Td, Th, buttonClass } from "@/components/ui";

export const metadata = { title: "Admin · Profiles" };

const TABS = [
  { key: "pending", label: "New Requests" },
  { key: "verified", label: "Verified" },
  { key: "banned", label: "Banned / Blocked" },
  { key: "expired", label: "Expired" },
];

export default async function AdminProfiles({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab: rawTab, q } = await searchParams;
  const tab = TABS.some((t) => t.key === rawTab) ? rawTab! : "pending";
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
    return query.or(`status.eq.expired,and(status.eq.verified,valid_until.lt.${nowIso})`);
  }

  const counts = await Promise.all(TABS.map(async (t) => {
    const { count } = await applyTab(base("id", true), t.key);
    return count ?? 0;
  }));

  let listQuery = applyTab(base("*"), tab).order("created_at", { ascending: false }).limit(200);
  if (q) listQuery = listQuery.ilike("full_name", `%${q.replace(/[%,]/g, "")}%`);
  const { data } = await listQuery;
  const rows = (data ?? []) as unknown as {
    id: string; full_name: string; gender: string; city: string; dob: string; marital_status: string;
    created_at: string; valid_until: string | null; is_verified: boolean; status: string;
  }[];

  return (
    <PageContainer>
      <PageTitle title="Profiles" />
      <TabNav basePath="/admin/profiles" active={tab} tabs={TABS.map((t, i) => ({ ...t, count: counts[i] }))} />

      <form className="mb-4 flex gap-2">
        <input type="hidden" name="tab" value={tab} />
        <input name="q" defaultValue={q} placeholder="Search by name…" className="w-full max-w-xs rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        <button className={buttonClass("secondary", "sm")}>Search</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState>No profiles in this tab.</EmptyState>
      ) : (
        <TableWrap>
          <thead>
            <tr><Th>Name</Th><Th>Gender / Age</Th><Th>City</Th><Th>Marital</Th><Th>Registered</Th>{tab !== "pending" && <Th>Valid until</Th>}<Th /></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>
                  <span className="flex items-center gap-1 font-medium">
                    {r.full_name}
                    {r.is_verified && <BadgeCheck className="h-4 w-4 text-emerald-600" />}
                  </span>
                </Td>
                <Td>{labelize(r.gender)} · {calcAge(r.dob)}</Td>
                <Td>{r.city}</Td>
                <Td><Badge>{labelize(r.marital_status)}</Badge></Td>
                <Td>{formatDate(r.created_at)}</Td>
                {tab !== "pending" && <Td>{formatDay(r.valid_until)}</Td>}
                <Td><Link href={`/admin/profiles/${r.id}`} className={buttonClass("outline", "sm")}>{tab === "pending" ? "Review" : "Open"}</Link></Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </PageContainer>
  );
}
