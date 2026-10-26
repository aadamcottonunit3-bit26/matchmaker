import Link from "next/link";
import { Heart, MessageCircle, Phone } from "lucide-react";
import { contactPhone, whatsappDigits } from "@/lib/contact";

export function Footer() {
  const phone = contactPhone();
  const wa = whatsappDigits();
  return (
    <footer className="mt-auto border-t border-stone-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-stone-600 sm:px-6 md:grid-cols-3">
        <div>
          <p className="flex items-center gap-2 text-lg font-bold text-rose-800">
            <Heart className="h-5 w-5 fill-rose-700 text-rose-700" /> Rishta Bureau
          </p>
          <p className="mt-2 max-w-xs">
            Verified profiles, private photos and respectful matchmaking for serious marriage proposals.
          </p>
        </div>
        <div>
          <p className="mb-2 font-semibold text-stone-900">Quick links</p>
          <ul className="space-y-1.5">
            <li><Link href="/register" className="hover:text-rose-700">Create profile</Link></li>
            <li><Link href="/pricing" className="hover:text-rose-700">Pricing</Link></li>
            <li><Link href="/#faq" className="hover:text-rose-700">FAQ</Link></li>
            <li><Link href="/about-us" className="hover:text-rose-700">About Us</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-2 font-semibold text-stone-900">Contact</p>
          <ul className="space-y-1.5">
            {phone && (
              <li><a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 hover:text-rose-700"><Phone className="h-4 w-4" />{phone}</a></li>
            )}
            {wa && (
              <li><a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-rose-700"><MessageCircle className="h-4 w-4" />WhatsApp</a></li>
            )}
            <li><Link href="/terms-and-conditions" className="hover:text-rose-700">Terms &amp; Conditions</Link></li>
            <li><Link href="/privacy-policy" className="hover:text-rose-700">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-100 py-4 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} Rishta Bureau. All rights reserved.
      </div>
    </footer>
  );
}
