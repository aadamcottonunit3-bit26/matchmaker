import { Check } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { formatPKR } from "@/lib/utils";
import type { Plan } from "@/lib/types";

export function PlanCard({ plan, action }: { plan: Plan; action?: React.ReactNode }) {
  const featured = plan.tier === "vip";
  return (
    <Card className={featured ? "border-rose-300 ring-2 ring-rose-200" : ""}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{plan.name}</h3>
        {featured && <Badge tone="rose">Most popular</Badge>}
      </div>
      <p className="text-3xl font-bold text-stone-900">
        {plan.price_pkr === 0 ? "Free" : formatPKR(plan.price_pkr)}
        <span className="text-sm font-normal text-stone-500"> / {plan.duration_days} days</span>
      </p>
      <ul className="my-4 space-y-2 text-sm text-stone-700">
        {(plan.features ?? []).map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            {f}
          </li>
        ))}
      </ul>
      {action}
    </Card>
  );
}
