import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { namesFor } from "@/lib/admin";
import { formatDate, labelize } from "@/lib/utils";
import { Badge, EmptyState, PageContainer, PageTitle, TabNav, TableWrap, Td, Th } from "@/components/ui";

export const metadata = { title: "Admin · Audit logs" };

const TABS = [
  { key: "moderation", label: "Moderation (ban / verify)" },
  { key: "admin", label: "Admin access log" },
];

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const { tab: raw } = await searchParams;
  const tab = TABS.some((t) => t.key === raw) ? raw! : "moderation";
  const supabase = await createClient();

  const { data: mod } = tab === "moderation"
    ? await supabase.from("moderation_log").select("*").order("created_at", { ascending: false }).limit(300)
    : { data: [] };
  const { data: logs } = tab === "admin"
    ? await supabase.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(300)
    : { data: [] };

  const names = await namesFor([
    ...(mod ?? []).flatMap((m) => [m.profile_id, m.admin_id]),
    ...(logs ?? []).map((l) => l.admin_id),
  ]);

  return (
    <PageContainer>
      <PageTitle title="Audit logs" />
      <TabNav basePath="/admin/audit" active={tab} tabs={TABS} />
      {tab === "moderation" ? (
        (mod ?? []).length === 0 ? <EmptyState>No moderation actions yet.</EmptyState> : (
          <TableWrap>
            <thead><tr><Th>Time</Th><Th>Action</Th><Th>Profile</Th><Th>Admin</Th><Th>Reason</Th></tr></thead>
            <tbody>
              {(mod ?? []).map((m) => (
                <tr key={m.id}>
                  <Td>{formatDate(m.created_at)}</Td>
                  <Td><Badge tone={m.action === "ban" ? "red" : m.action === "verify" ? "green" : "blue"}>{m.action}</Badge></Td>
                  <Td>{names.get(m.profile_id)}</Td>
                  <Td>{names.get(m.admin_id)}</Td>
                  <Td>{m.reason}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )
      ) : (logs ?? []).length === 0 ? <EmptyState>No entries yet.</EmptyState> : (
        <TableWrap>
          <thead><tr><Th>Time</Th><Th>Admin</Th><Th>Action</Th><Th>Target</Th><Th>IP</Th></tr></thead>
          <tbody>
            {(logs ?? []).map((l) => (
              <tr key={l.id}>
                <Td>{formatDate(l.created_at)}</Td>
                <Td>{names.get(l.admin_id)}</Td>
                <Td>{labelize(l.action)}</Td>
                <Td className="text-xs">{l.target_type}: {l.target_id}</Td>
                <Td>{l.ip_address ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </PageContainer>
  );
}
