import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPlans } from "@/lib/cms";
import { formatDate, formatDay, formatPKR, labelize } from "@/lib/utils";
import { Badge, Card, PageContainer, PageTitle, TableWrap, Td, Th } from "@/components/ui";
import { PlanCard } from "@/components/PlanCard";
import { PaymentForm } from "./PaymentForm";

export const metadata = { title: "Plans & payments" };

export default async function BillingPage() {
  const me = await requireMe();
  const supabase = await createClient();
  const plans = await getPlans();
  const paid = plans.filter((p) => Number(p.price_pkr) > 0);
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount_pkr, method, status, admin_note, created_at, plan_id")
    .eq("user_id", me.id)
    .order("created_at", { ascending: false });

  const current = plans.find((p) => p.id === me.plan_id);

  return (
    <PageContainer>
      <PageTitle title="Plans & payments" />
      <Card className="mb-6">
        <p className="text-sm text-stone-700">
          Current plan: <b>{current?.name ?? "None"}</b>
          {me.valid_until && <> · valid until <b>{formatDay(me.valid_until)}</b></>}
        </p>
      </Card>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {plans.map((p) => <PlanCard key={p.id} plan={p} />)}
      </div>

      <div className="mb-8">
        <PaymentForm plans={paid} />
      </div>

      <h2 className="mb-3 text-lg font-semibold">Payment history</h2>
      <TableWrap>
        <thead><tr><Th>Date</Th><Th>Plan</Th><Th>Amount</Th><Th>Method</Th><Th>Status</Th><Th>Note</Th></tr></thead>
        <tbody>
          {(payments ?? []).map((p) => (
            <tr key={p.id}>
              <Td>{formatDate(p.created_at)}</Td>
              <Td>{plans.find((x) => x.id === p.plan_id)?.name ?? "—"}</Td>
              <Td>{formatPKR(p.amount_pkr)}</Td>
              <Td>{labelize(p.method)}</Td>
              <Td><Badge tone={p.status === "approved" ? "green" : p.status === "pending" ? "yellow" : "red"}>{labelize(p.status)}</Badge></Td>
              <Td>{p.admin_note ?? "—"}</Td>
            </tr>
          ))}
          {(payments ?? []).length === 0 && <tr><Td className="text-center text-stone-500">No payments yet.</Td><Td /><Td /><Td /><Td /><Td /></tr>}
        </tbody>
      </TableWrap>
    </PageContainer>
  );
}
