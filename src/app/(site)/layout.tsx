import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // The admin account is for administration only: send it to the admin dashboard.
  const me = await getMe();
  if (me?.role === "admin") redirect("/admin");

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
