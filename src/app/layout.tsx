import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Rishta Bureau — Trusted Marriage Matchmaking", template: "%s | Rishta Bureau" },
  description: "Verified profiles, private photos and smart compatibility matching for serious marriage proposals.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Public pages get the site header/footer from app/(site)/layout.tsx.
// The admin area has its own sidebar layout (app/admin/layout.tsx).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
