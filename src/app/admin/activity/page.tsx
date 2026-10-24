import { createClient } from "@/lib/supabase/server";
import { namesFor } from "@/lib/admin";
import { formatDate } from "@/lib/utils";
import { EmptyState, PageContainer, PageTitle, TableWrap, Td, Th } from "@/components/ui";

export const metadata = { title: "Admin · Activity" };

export default async function AdminActivity({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let viewerFilter: string[] | null = null;
  if (q) {
    const { data: found } = await supabase.from("profiles").select("id").ilike("full_name", `%${q.replace(/[%,]/g, "")}%`).limit(50);
    viewerFilter = (found ?? []).map((f) => f.id);
  }

  let query = supabase.from("profile_views").select("*").order("viewed_at", { ascending: false }).limit(300);
  if (viewerFilter) {
    const list = viewerFilter.length ? viewerFilter.join(",") : "00000000-0000-0000-0000-000000000000";
    query = query.or(`viewer_id.in.(${list}),viewed_id.in.(${list})`);
  }
  const { data: views } = await query;
  const names = await namesFor((views ?? []).flatMap((v) => [v.viewer_id, v.viewed_id]));

  return (
    <PageContainer>
      <PageTitle title="Activity log" subtitle="Which member viewed which profile, with time, IP and device." />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Filter by member name…" className="w-full max-w-xs rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        <button className="rounded-lg bg-stone-100 px-3 py-2 text-sm">Filter</button>
      </form>
      {(views ?? []).length === 0 ? (
        <EmptyState>No activity recorded.</EmptyState>
      ) : (
        <TableWrap>
          <thead><tr><Th>Time</Th><Th>Viewer</Th><Th>Viewed profile</Th><Th>IP</Th><Th>Device</Th><Th>Browser / UA</Th></tr></thead>
          <tbody>
            {(views ?? []).map((v) => (
              <tr key={v.id}>
                <Td>{formatDate(v.viewed_at)}</Td>
                <Td>{names.get(v.viewer_id) ?? v.viewer_id}</Td>
                <Td>{names.get(v.viewed_id) ?? v.viewed_id}</Td>
                <Td>{v.ip_address ?? "—"}</Td>
                <Td>{v.device ?? "—"}</Td>
                <Td className="max-w-xs truncate text-xs text-stone-500">{v.user_agent ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </PageContainer>
  );
}
