import { createClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/storage";
import { namesFor } from "@/lib/admin";
import { formatDate, formatPKR, labelize } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, Input, PageContainer, PageTitle, TabNav } from "@/components/ui";
import { reviewPayment } from "./actions";

export const metadata = { title: "Admin · Payments" };

const TABS = [
  { key: "pending", label: "Awaiting approval" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default async function AdminPayments({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: raw } = await searchParams;
  const tab = TABS.some((t) => t.key === raw) ? raw! : "pending";
  const supabase = await createClient();

  const [{ data: payments }, { data: plans }] = await Promise.all([
    supabase.from("payments").select("*").eq("status", tab).order("created_at", { ascending: tab === "pending" }).limit(200),
    supabase.from("plans").select("id, name"),
  ]);
  const names = await namesFor((payments ?? []).map((p) => p.user_id));
  const receipts = await Promise.all((payments ?? []).map((p) => signedUrl("payment-receipts", p.receipt_path, 600)));

  return (
    <PageContainer>
      <PageTitle title="Payments" subtitle="Manually verify JazzCash, EasyPaisa and bank receipts before activating a plan." />
      <TabNav basePath="/admin/payments" active={tab} tabs={TABS} />

      {(payments ?? []).length === 0 ? (
        <EmptyState>Nothing here.</EmptyState>
      ) : (
        <div className="space-y-4">
          {(payments ?? []).map((p, i) => (
            <Card key={p.id} className="grid gap-4 md:grid-cols-[1fr_200px]">
              <div className="space-y-1 text-sm">
                <p className="text-base font-semibold">{names.get(p.user_id) ?? "Member"}</p>
                <p>Plan: <b>{plans?.find((x) => x.id === p.plan_id)?.name}</b> · Amount: <b>{formatPKR(p.amount_pkr)}</b></p>
                <p>Method: {labelize(p.method)} · Ref: {p.transaction_ref ?? "—"}</p>
                <p className="text-stone-500">Submitted {formatDate(p.created_at)}</p>
                {p.status !== "pending" && (
                  <p><Badge tone={p.status === "approved" ? "green" : "red"}>{labelize(p.status)}</Badge> {p.admin_note && <span className="text-stone-600">— {p.admin_note}</span>}</p>
                )}
                {p.status === "pending" && (
                  <form action={reviewPayment} className="flex flex-wrap items-center gap-2 pt-2">
                    <input type="hidden" name="id" value={p.id} />
                    <Input name="note" placeholder="Note (required to reject)" className="max-w-xs" />
                    <Button name="decision" value="approve" variant="success" size="sm">Approve &amp; activate</Button>
                    <Button name="decision" value="reject" variant="danger" size="sm">Reject</Button>
                  </form>
                )}
              </div>
              {receipts[i] ? (
                <a href={receipts[i]!} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={receipts[i]!} alt="Receipt" className="max-h-56 w-full rounded-lg border object-contain" />
                </a>
              ) : <p className="text-sm text-stone-500">Receipt unavailable</p>}
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
