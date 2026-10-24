import { getPlans } from "@/lib/cms";
import { PageContainer, PageTitle, LinkButton } from "@/components/ui";
import { PlanCard } from "@/components/PlanCard";

export const metadata = { title: "Pricing" };

export default async function PricingPage() {
  const plans = await getPlans();
  return (
    <PageContainer>
      <PageTitle title="Pricing" subtitle="Pay by JazzCash, EasyPaisa or bank transfer. Our team activates your plan after checking your receipt." />
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} action={<LinkButton href="/billing" className="w-full">Choose plan</LinkButton>} />
        ))}
      </div>
    </PageContainer>
  );
}
