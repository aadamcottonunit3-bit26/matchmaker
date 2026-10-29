import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { namesFor } from "@/lib/admin";
import { formatDate } from "@/lib/utils";
import { EmptyState, PageContainer, PageTitle, TableWrap, Td, Th, buttonClass } from "@/components/ui";

export const metadata = { title: "Admin · Message monitoring" };

export default async function AdminMessages() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: convs } = await supabase.from("conversations").select("*").order("created_at", { ascending: false }).limit(200);
  const ids = (convs ?? []).map((c) => c.id);
  const { data: msgs } = ids.length
    ? await supabase.from("messages").select("conversation_id, body, created_at").in("conversation_id", ids).order("created_at", { ascending: false }).limit(1000)
    : { data: [] as { conversation_id: string; body: string; created_at: string }[] };
  const names = await namesFor((convs ?? []).flatMap((c) => [c.user_a, c.user_b]));

  return (
    <PageContainer>
      <PageTitle title="Message monitoring" subtitle="Read-only access for safety and dispute resolution. Every chat you open is recorded in the audit log." />
      {(convs ?? []).length === 0 ? (
        <EmptyState>No conversations yet.</EmptyState>
      ) : (
        <TableWrap>
          <thead><tr><Th>Participants</Th><Th>Last message</Th><Th>When</Th><Th /></tr></thead>
          <tbody>
            {(convs ?? []).map((c) => {
              const last = msgs?.find((m) => m.conversation_id === c.id);
              return (
                <tr key={c.id}>
                  <Td>{names.get(c.user_a) ?? "?"} ↔ {names.get(c.user_b) ?? "?"}</Td>
                  <Td className="max-w-sm truncate">{last?.body ?? "—"}</Td>
                  <Td>{formatDate(last?.created_at ?? c.created_at)}</Td>
                  <Td><Link className={buttonClass("outline", "sm")} href={`/admin/messages/${c.id}`}>Read</Link></Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
    </PageContainer>
  );
}
