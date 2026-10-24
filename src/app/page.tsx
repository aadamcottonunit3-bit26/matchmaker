import { ShieldCheck, EyeOff, Sparkles, UserCheck } from "lucide-react";
import { getPlans, getSliders, cmsMediaUrl } from "@/lib/cms";
import { LinkButton, PageContainer, Card } from "@/components/ui";
import { PlanCard } from "@/components/PlanCard";

const features = [
  { icon: UserCheck, title: "Manually verified", text: "Every profile is checked against CNIC by our team before it goes live." },
  { icon: EyeOff, title: "Photo privacy", text: "Blur your photo and approve exactly who can see it." },
  { icon: Sparkles, title: "Smart matching", text: "Strict filters first, then a compatibility score on education, profession, income, family and lifestyle." },
  { icon: ShieldCheck, title: "Safe conversations", text: "Messaging is moderated for safety and dispute resolution." },
];

export default async function Home() {
  const [sliders, plans] = await Promise.all([getSliders(), getPlans()]);

  return (
    <>
      {sliders.length > 0 ? (
        <section className="flex snap-x snap-mandatory overflow-x-auto">
          {sliders.map((s) => (
            <div key={s.id} className="relative min-h-[320px] w-full shrink-0 snap-center sm:min-h-[420px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cmsMediaUrl(s.image_path)} alt={s.title ?? ""} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/45" />
              <div className="relative mx-auto flex h-full min-h-[320px] max-w-6xl flex-col justify-center gap-4 px-4 py-12 text-white sm:min-h-[420px] sm:px-6">
                <h1 className="max-w-2xl text-3xl font-bold sm:text-5xl">{s.title}</h1>
                {s.subtitle && <p className="max-w-xl text-lg text-white/90">{s.subtitle}</p>}
                <div>
                  <LinkButton href={s.link_url || "/register"} size="lg">
                    {s.link_url ? "Learn more" : "Create your profile"}
                  </LinkButton>
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="bg-gradient-to-br from-rose-700 to-rose-900 text-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <h1 className="max-w-2xl text-4xl font-bold sm:text-5xl">Find a life partner you can trust.</h1>
            <p className="mt-4 max-w-xl text-lg text-rose-100">
              Verified profiles, private photos and compatibility-based matches for serious marriage proposals.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/register" size="lg" variant="secondary">Create your profile</LinkButton>
              <LinkButton href="/pricing" size="lg" variant="ghost" className="text-white hover:bg-white/10">See pricing</LinkButton>
            </div>
          </div>
        </section>
      )}

      <PageContainer>
        <h2 className="mb-6 text-2xl font-bold">Why families choose us</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title}>
              <f.icon className="mb-3 h-7 w-7 text-rose-700" />
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{f.text}</p>
            </Card>
          ))}
        </div>

        {plans.length > 0 && (
          <>
            <h2 className="mb-6 mt-14 text-2xl font-bold">Simple pricing</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((p) => (
                <PlanCard key={p.id} plan={p} action={<LinkButton href="/register" variant="outline" className="w-full">Get started</LinkButton>} />
              ))}
            </div>
          </>
        )}
      </PageContainer>
    </>
  );
}
