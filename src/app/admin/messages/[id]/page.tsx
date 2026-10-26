import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAdminAction, namesFor } from "@/lib/admin";
import { cn, formatDate } from "@/lib/utils";
import { Alert, PageContainer } from "@/components/ui";

export const metadata = { title: "Admin · Chat" };

export default async function AdminChat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data: conv } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle();
  if (!conv) notFound();
  const { data: messages } = await supabase.from("messages").select("*").eq("conversation_id", id).order("created_at").limit(1000);
  const names = await namesFor([conv.user_a, conv.user_b]);

  await logAdminAction(admin.id, "read_conversation", "conversation", id);

  return (
    <PageContainer className="max-w-2xl">
      <Link href="/admin/messages" className="text-sm text-rose-700 hover:underline">← All conversations</Link>
      <h1 className="mb-1 mt-2 text-xl font-bold">{names.get(conv.user_a)} ↔ {names.get(conv.user_b)}</h1>
      <div className="mb-4"><Alert tone="info">Read-only view. This access has been logged.</Alert></div>
      <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-4">
        {(messages ?? []).map((m) => (
          <div key={m.id} className={cn("max-w-[85%] rounded-2xl px-3.5 py-2 text-sm", m.sender_id === conv.user_a ? "self-start bg-stone-100" : "self-end bg-sky-100")}>
            <p className="text-xs font-semibold text-stone-600">{names.get(m.sender_id)}</p>
            <p className="whitespace-pre-line break-words">{m.body}</p>
            <p className="mt-1 text-[10px] text-stone-500">{formatDate(m.created_at)}</p>
          </div>
        ))}
        {(messages ?? []).length === 0 && <p className="text-sm text-stone-500">No messages.</p>}
      </div>
    </PageContainer>
  );
}
