"use client";

import { useRef, useTransition } from "react";
import { Send } from "lucide-react";
import { sendMessage } from "./actions";
import { Button, Input } from "@/components/ui";

export function ChatForm({ conversationId }: { conversationId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        ref.current?.reset();
        start(() => sendMessage(fd));
      }}
      className="flex gap-2"
    >
      <input type="hidden" name="conversation_id" value={conversationId} />
      <Input name="body" placeholder="Type a message…" autoComplete="off" required maxLength={4000} />
      <Button type="submit" disabled={pending} aria-label="Send">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
