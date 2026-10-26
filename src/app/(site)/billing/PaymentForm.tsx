"use client";

import { startTransition, useActionState } from "react";
import { submitPayment } from "./actions";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import { PAYMENT_ACCOUNTS, PAYMENT_METHODS } from "@/lib/constants";
import { formatPKR } from "@/lib/utils";
import type { Plan } from "@/lib/types";

export function PaymentForm({ plans }: { plans: Plan[] }) {
  const [state, action, pending] = useActionState(submitPayment, undefined);

  return (
    <Card>
      <h2 className="mb-1 text-lg font-semibold">Submit a payment</h2>
      <p className="mb-4 text-sm text-stone-600">Send the amount to one of the accounts below, then upload your receipt. Our team activates your plan after checking it.</p>
      <ul className="mb-5 space-y-1 rounded-lg bg-stone-50 p-3 text-sm">
        {PAYMENT_ACCOUNTS.map((a) => (
          <li key={a.method}><b>{a.method}:</b> {a.detail}</li>
        ))}
      </ul>

      {state?.error && <div className="mb-4"><Alert tone="error">{state.error}</Alert></div>}
      {state?.ok && <div className="mb-4"><Alert tone="success">Payment submitted. We will review it shortly.</Alert></div>}

      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          startTransition(async () => {
            await action(fd);
          });
        }}
      >
        <Field label="Plan">
          <Select
            name="plan_id"
            required
            placeholder="Select plan…"
            options={plans.map((p) => ({ value: p.id, label: `${p.name} — ${formatPKR(p.price_pkr)} / ${p.duration_days} days` }))}
          />
        </Field>
        <Field label="Paid via">
          <Select name="method" required placeholder="Select…" options={PAYMENT_METHODS} />
        </Field>
        <Field label="Transaction ID / reference (optional)">
          <Input name="transaction_ref" maxLength={80} />
        </Field>
        <Field label="Receipt screenshot">
          <Input name="receipt" type="file" accept="image/jpeg,image/png,image/webp" required />
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>{pending ? "Uploading…" : "Submit payment"}</Button>
        </div>
      </form>
    </Card>
  );
}
