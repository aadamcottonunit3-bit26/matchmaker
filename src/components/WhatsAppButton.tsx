import { MessageCircle } from "lucide-react";
import { whatsappDigits } from "@/lib/contact";

/** Floating WhatsApp button. Renders nothing until NEXT_PUBLIC_WHATSAPP_NUMBER is set. */
export function WhatsAppButton() {
  const digits = whatsappDigits();
  if (!digits) return null;
  const text = encodeURIComponent("Assalam-o-Alaikum, I would like to know more about Rishta Bureau.");
  return (
    <a
      href={`https://wa.me/${digits}?text=${text}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-700 sm:bottom-6 sm:right-6"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
