import {
  Bookmark, Camera, CheckCircle2, ChevronDown, EyeOff, Flag, MessageCircle, Phone, ShieldCheck,
  Sparkles, UserCheck, UserPlus,
} from "lucide-react";
import { getPlans, getSliders, cmsMediaUrl } from "@/lib/cms";
import { getVerifiedMemberCount } from "@/lib/stats";
import { contactPhone, whatsappDigits } from "@/lib/contact";
import { LinkButton, PageContainer, Card } from "@/components/ui";
import { PlanCard } from "@/components/PlanCard";

const features = [
  { icon: UserCheck, title: "CNIC verified by humans", text: "Every profile is checked against CNIC and a selfie by our team before it goes live." },
  { icon: EyeOff, title: "Photo privacy", text: "Blur your photo and approve exactly who can see it." },
  { icon: Sparkles, title: "Smart matching", text: "Strict filters first, then a compatibility score on education, profession, income, family and lifestyle." },
  { icon: ShieldCheck, title: "Safe conversations", text: "Messaging is moderated for safety and dispute resolution." },
  { icon: Bookmark, title: "Shortlist", text: "Save the profiles you like and come back to them with your family." },
  { icon: Flag, title: "Report anything", text: "One tap to report a fake or disrespectful profile. Our admin reviews every report." },
];

const steps = [
  { icon: UserPlus, title: "Create your profile", text: "Fill in your details, partner preferences and upload your CNIC, selfie and photo." },
  { icon: ShieldCheck, title: "We verify you", text: "Our team checks your documents and gives your profile the green verified tick." },
  { icon: Sparkles, title: "Get matched", text: "See compatible profiles ranked by how well they fit your preferences." },
  { icon: MessageCircle, title: "Connect respectfully", text: "Message, request photos and involve your family when you are ready." },
];

const faqs = [
  { q: "Is my information private? (Kya meri maloomat mehfooz hai?)", a: "Yes. Your CNIC and phone number are visible only to our admin team, never to other members. You can also blur your photo and decide who may see it." },
  { q: "How are profiles verified?", a: "Every new profile is reviewed by our team. We compare your CNIC, a selfie holding your CNIC and your profile photo before the green tick is given." },
  { q: "Is it free to start?", a: "Creating a profile is free. Paid plans unlock full browsing and messaging for the plan period. See the pricing section for current prices." },
  { q: "How do I pay for a plan?", a: "You pay by JazzCash, EasyPaisa or bank transfer and upload the receipt. Our team approves it and your plan starts." },
  { q: "Can my family use my account to look for a rishta?", a: "Yes, many families do. We suggest you keep your login private and add real details only, so that matches are genuine." },
  { q: "What if someone behaves badly?", a: "Use the Report button on the profile. Our admin reviews it and can block the profile with a recorded reason." },
];

export default async function Home() {
  const [sliders, plans, verifiedCount] = await Promise.all([getSliders(), getPlans(), getVerifiedMemberCount()]);
  const phone = contactPhone();
  const wa = whatsappDigits();
  // Only show a number once it is big enough to be meaningful.
  const verifiedLabel = verifiedCount >= 10 ? `${Math.floor(verifiedCount / 10) * 10}+` : null;

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
        <section className="relative overflow-hidden bg-gradient-to-br from-rose-800 via-rose-900 to-stone-900 text-white">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-rose-500/20 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-amber-200 sm:text-sm">
                <CheckCircle2 className="h-4 w-4" /> Verified profiles · Family-friendly · Private
              </span>
              <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">Find a life partner you can trust.</h1>
              <p className="mt-4 max-w-xl text-lg text-rose-100">
                Compatibility-based matches for serious marriage proposals. Har profile CNIC se verify hota hai, aur aap ki photo aap ke control me rehti hai.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <LinkButton href="/register" size="lg" variant="secondary" className="w-full sm:w-auto">Create your profile</LinkButton>
                <LinkButton href="/pricing" size="lg" variant="ghost" className="w-full text-white hover:bg-white/10 sm:w-auto">See pricing</LinkButton>
              </div>
              {verifiedLabel && (
                <p className="mt-6 text-sm text-rose-100">
                  <b className="text-xl text-amber-300">{verifiedLabel}</b> verified profiles on the platform
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="mb-3 font-semibold text-amber-200">How we keep it safe</p>
              <ul className="space-y-3 text-sm text-rose-50">
                {[
                  { icon: UserCheck, t: "CNIC + selfie checked by our team" },
                  { icon: Camera, t: "Blur your photo, approve who sees it" },
                  { icon: ShieldCheck, t: "Phone and CNIC never shown to members" },
                  { icon: Flag, t: "Report button on every profile" },
                ].map((i) => (
                  <li key={i.t} className="flex items-center gap-3">
                    <i.icon className="h-5 w-5 shrink-0 text-amber-300" />
                    {i.t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <PageContainer>
        <h2 className="mb-2 text-2xl font-bold">How it works</h2>
        <p className="mb-6 text-stone-600">Four simple steps from sign-up to a respectful introduction.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Card key={s.title} className="relative">
              <span className="absolute right-4 top-3 text-4xl font-black text-rose-100">{i + 1}</span>
              <s.icon className="mb-3 h-7 w-7 text-rose-700" />
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{s.text}</p>
            </Card>
          ))}
        </div>

        <h2 className="mb-6 mt-14 text-2xl font-bold">Why families choose us</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        <h2 id="faq" className="mb-6 mt-14 scroll-mt-24 text-2xl font-bold">Questions families ask</h2>
        <div className="space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-xl border border-stone-200 bg-white p-4 shadow-sm open:shadow-md">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-stone-900">
                {f.q}
                <ChevronDown className="h-5 w-5 shrink-0 text-stone-400 transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">{f.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-14 rounded-2xl bg-gradient-to-r from-rose-700 to-rose-900 p-6 text-center text-white sm:p-10">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to start your rishta journey?</h2>
          <p className="mx-auto mt-2 max-w-xl text-rose-100">Create your profile in a few minutes. Our team will verify it and you can start seeing matches.</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LinkButton href="/register" size="lg" variant="secondary" className="w-full sm:w-auto">Create your profile</LinkButton>
            {wa && (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-base font-medium text-white hover:bg-emerald-700 sm:w-auto"
              >
                <MessageCircle className="h-5 w-5" /> Chat on WhatsApp
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/40 px-6 py-3 text-base font-medium text-white hover:bg-white/10 sm:w-auto"
              >
                <Phone className="h-5 w-5" /> {phone}
              </a>
            )}
          </div>
        </div>
      </PageContainer>
    </>
  );
}
