import Link from "next/link";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { Card, EmptyState, PageContainer, PageTitle } from "@/components/ui";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const me = await requireMe();
  const supabase = await createClient();

  const { data: convs } = await supabase
    .from("conversations")
    .select("id, user_a, user_b, created_at")
    .or(`user_a.eq.${me.id},user_b.eq.${me.id}`)
    .order("created_at", { ascending: false });

  const ids = (convs ?? []).map((c) => c.id);
  const otherIds = (convs ?? []).map((c) => (c.user_a === me.id ? c.user_b : c.user_a));

  const [{ data: msgs }, { data: people }] = await Promise.all([
    ids.length
      ? supabase.from("messages").select("conversation_id, body, created_at, sender_id").in("conversation_id", ids).order("created_at", { ascending: false }).limit(500)
      : Promise.resolve({ data: [] as { conversation_id: string; body: string; created_at: string; sender_id: string }[] }),
    otherIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", otherIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);

  const rows = (convs ?? []).map((c) => {
    const other = c.user_a === me.id ? c.user_b : c.user_a;
    const last = msgs?.find((m) => m.conversation_id === c.id);
    return {
      id: c.id,
      name: people?.find((p) => p.id === other)?.full_name ?? "Member",
      last,
      sortKey: last?.created_at ?? c.created_at,
    };
  }).sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1));

  return (
    <PageContainer className="max-w-3xl">
      <PageTitle title="Messages" />
      {rows.length === 0 ? (
        <EmptyState>
          No conversations yet. Open a profile from your <Link href="/dashboard" className="text-rose-700 underline">matches</Link> and send a message.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Link key={r.id} href={`/messages/${r.id}`}>
              <Card className="transition hover:shadow-md">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{r.name}</p>
                  {r.last && <span className="text-xs text-stone-500">{formatDate(r.last.created_at)}</span>}
                </div>
                <p className="mt-1 truncate text-sm text-stone-600">{r.last?.body ?? "No messages yet"}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
