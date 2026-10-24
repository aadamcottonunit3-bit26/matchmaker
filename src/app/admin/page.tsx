import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, PageContainer, PageTitle } from "@/components/ui";

export const metadata = { title: "Admin" };

export default async function AdminHome() {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

  const [pending, verified, banned, expired, payments, members] = await Promise.all([
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending").eq("role", "member")),
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "verified").eq("role", "member").or(`valid_until.is.null,valid_until.gt.${nowIso}`)),
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "banned")),
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).or(`status.eq.expired,and(status.eq.verified,valid_until.lt.${nowIso})`)),
    count(supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending")),
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "member")),
  ]);

  const tiles = [
    { label: "New profile requests", value: pending, href: "/admin/profiles?tab=pending" },
    { label: "Verified members", value: verified, href: "/admin/profiles?tab=verified" },
    { label: "Banned", value: banned, href: "/admin/profiles?tab=banned" },
    { label: "Expired", value: expired, href: "/admin/profiles?tab=expired" },
    { label: "Payments awaiting approval", value: payments, href: "/admin/payments?tab=pending" },
    { label: "Total members", value: members, href: "/admin/profiles?tab=verified" },
  ];

  return (
    <PageContainer>
      <PageTitle title="Admin overview" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href}>
            <Card className="transition hover:shadow-md">
              <p className="text-3xl font-bold text-rose-800">{t.value}</p>
              <p className="text-sm text-stone-600">{t.label}</p>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
