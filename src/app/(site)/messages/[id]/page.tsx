import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe, isActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, cn } from "@/lib/utils";
import { Alert, PageContainer } from "@/components/ui";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ChatForm } from "./ChatForm";

export const metadata = { title: "Chat" };

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireMe();
  const supabase = await createClient();

  const { data: conv } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle();
  if (!conv || (conv.user_a !== me.id && conv.user_b !== me.id)) notFound();

  const otherId = conv.user_a === me.id ? conv.user_b : conv.user_a;
  const [{ data: other }, { data: messages }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("id", otherId).maybeSingle(),
    supabase.from("messages").select("id, sender_id, body, created_at").eq("conversation_id", id).order("created_at").limit(500),
  ]);

  return (
    <PageContainer className="max-w-2xl">
      <AutoRefresh />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">{other?.full_name ?? "Member"}</h1>
        <Link href="/messages" className="text-sm text-rose-700 hover:underline">← All chats</Link>
      </div>

      <div className="mb-4 flex min-h-[50vh] flex-col gap-2 rounded-xl border border-stone-200 bg-white p-4">
        {(messages ?? []).length === 0 && <p className="m-auto text-sm text-stone-500">Say salaam 👋</p>}
        {(messages ?? []).map((m) => (
          <div key={m.id} className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm", m.sender_id === me.id ? "self-end bg-rose-700 text-white" : "self-start bg-stone-100 text-stone-900")}>
            <p className="whitespace-pre-line break-words">{m.body}</p>
            <p className={cn("mt-1 text-[10px]", m.sender_id === me.id ? "text-rose-100" : "text-stone-500")}>{formatDate(m.created_at)}</p>
          </div>
        ))}
      </div>

      {isActiveMember(me) ? (
        <ChatForm conversationId={id} />
      ) : (
        <Alert tone="warn">Your membership is not active, so you cannot send messages.</Alert>
      )}
      <p className="mt-3 text-xs text-stone-500">Messages are monitored by our team for safety. Never share money or bank details.</p>
    </PageContainer>
  );
}
