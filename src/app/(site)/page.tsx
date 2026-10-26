import {
  Bookmark, CheckCircle2, ChevronDown, EyeOff, Flag, Heart, HeartHandshake, MessageCircle, Phone,
  ShieldCheck, Sparkles, UserCheck, UserPlus, Users,
} from "lucide-react";
import { cmsMediaUrl, getGallery, getPlans, getSliders } from "@/lib/cms";
import { getVerifiedMemberCount } from "@/lib/stats";
import { contactPhone, whatsappDigits } from "@/lib/contact";
import { LinkButton } from "@/components/ui";
import { PlanCard } from "@/components/PlanCard";
import { OrnamentDivider, RingsIcon, SectionHeading } from "@/components/home/Ornament";

const trust = [
  { icon: UserCheck, text: "CNIC & selfie verified" },
  { icon: EyeOff, text: "Private photos" },
  { icon: Users, text: "Family-friendly" },
  { icon: ShieldCheck, text: "Every profile approved by our team" },
];

const audiences = [
  { icon: Heart, title: "Looking for a bride", ur: "دلہن کی تلاش", text: "Families and sons can find verified, compatible brides in their city and preferences." },
  { icon: HeartHandshake, title: "Looking for a groom", ur: "دولہا کی تلاش", text: "Parents and daughters can browse verified grooms with details they can trust." },
  { icon: Users, title: "Second marriage", ur: "دوسری شادی", text: "Divorced and widowed members are welcome and matched respectfully." },
];

const steps = [
  { icon: UserPlus, title: "Create your profile", text: "Fill in your details and partner wishes. Upload CNIC, selfie and photo." },
  { icon: ShieldCheck, title: "We verify you", text: "Our team checks your documents and gives your profile the green tick." },
  { icon: Sparkles, title: "Get matched", text: "See compatible profiles ranked by how well they fit your wishes." },
  { icon: MessageCircle, title: "Connect respectfully", text: "Message, request photos and involve your family when ready." },
];

const features = [
  { icon: UserCheck, title: "CNIC verified by humans", text: "Every profile is checked against CNIC and a selfie before it goes live." },
  { icon: EyeOff, title: "Photo privacy", text: "Blur your photo and approve exactly who can see it." },
  { icon: Sparkles, title: "Smart matching", text: "Strict filters first, then a compatibility score on education, profession, income, family and lifestyle." },
  { icon: ShieldCheck, title: "Safe conversations", text: "Messaging is moderated for safety and dispute resolution." },
  { icon: Bookmark, title: "Shortlist", text: "Save the profiles you like and revisit them with your family." },
  { icon: Flag, title: "Report anything", text: "One tap to report a fake or disrespectful profile. Our admin reviews every report." },
];

const faqs = [
  { q: "Is my information private? (Kya meri maloomat mehfooz hai?)", a: "Yes. Your CNIC and phone number are visible only to our admin team, never to other members. You can also blur your photo and decide who may see it." },
  { q: "How are profiles verified?", a: "Every new profile is reviewed by our team. We compare your CNIC, a selfie holding your CNIC and your profile photo before the green tick is given." },
  { q: "Is it free to start?", a: "Creating a profile is free. Paid plans unlock full browsing and messaging for the plan period. See the pricing section for current prices." },
  { q: "How do I pay for a plan?", a: "You pay by JazzCash, EasyPaisa or bank transfer and upload the receipt. Our team approves it and your plan starts." },
  { q: "Can my family use my account to look for a rishta?", a: "Yes, many families do. Keep your login private and add real details only, so that matches are genuine." },
  { q: "What if someone behaves badly?", a: "Use the Report button on the profile. Our admin reviews it and can block the profile with a recorded reason." },
];

export default async function Home() {
  const [sliders, gallery, plans, verifiedCount] = await Promise.all([
    getSliders(),
    getGallery(),
    getPlans(),
    getVerifiedMemberCount(),
  ]);
  const phone = contactPhone();
  const wa = whatsappDigits();
  // Only show a number once it is big enough to be meaningful.
  const verifiedLabel = verifiedCount >= 10 ? `${Math.floor(verifiedCount / 10) * 10}+` : null;

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      {sliders.length > 0 ? (
        <section className="flex snap-x snap-mandatory overflow-x-auto">
          {sliders.map((s) => (
            <div key={s.id} className="relative min-h-[360px] w-full shrink-0 snap-center sm:min-h-[480px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cmsMediaUrl(s.image_path)} alt={s.title ?? ""} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-rose-950/90 via-rose-950/65 to-rose-950/15" />
              <div className="bg-jali absolute inset-0 opacity-60" />
              <div className="relative mx-auto flex min-h-[360px] max-w-6xl flex-col justify-center gap-4 px-4 py-12 text-white sm:min-h-[480px] sm:px-6">
                <RingsIcon className="h-10 w-10 text-amber-300" />
                <h1 className="max-w-2xl font-serif text-3xl font-bold leading-tight sm:text-5xl">{s.title || "Find a life partner you can trust"}</h1>
                {s.subtitle && <p className="max-w-xl text-lg text-rose-50">{s.subtitle}</p>}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <LinkButton href="/register" size="lg" className="bg-amber-400 text-rose-950 hover:bg-amber-300">Create your profile</LinkButton>
                  {s.link_url && <LinkButton href={s.link_url} size="lg" variant="ghost" className="text-white hover:bg-white/10">Learn more</LinkButton>}
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="relative overflow-hidden bg-gradient-to-br from-rose-950 via-rose-900 to-rose-800 text-white">
          <div className="bg-jali absolute inset-0" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-rose-500/20 blur-3xl" />

          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-white/5 px-4 py-1.5 text-xs font-medium text-amber-200 sm:text-sm">
                <CheckCircle2 className="h-4 w-4" /> Verified profiles · Family-friendly · Private
              </span>
              <h1 className="mt-5 text-balance font-serif text-4xl font-bold leading-tight sm:text-5xl">
                Rishta wohi, jo <span className="text-amber-300">bharose</span> ka ho.
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-lg text-rose-100 lg:mx-0">
                A trusted marriage bureau for serious families. Every profile is checked against CNIC by our team, and your photo stays in your control.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <LinkButton href="/register" size="lg" className="w-full bg-amber-400 text-rose-950 hover:bg-amber-300 sm:w-auto">
                  Create your profile
                </LinkButton>
                <LinkButton href="/pricing" size="lg" variant="ghost" className="w-full border border-white/30 text-white hover:bg-white/10 sm:w-auto">
                  See pricing
                </LinkButton>
              </div>
              {verifiedLabel && (
                <p className="mt-6 text-sm text-rose-100">
                  <b className="font-serif text-2xl text-amber-300">{verifiedLabel}</b> verified profiles
                </p>
              )}
            </div>

            {/* Nikah-card style panel */}
            <div className="relative mx-auto w-full max-w-sm">
              <div className="absolute -inset-3 rounded-[34px] bg-amber-300/20 blur-xl" />
              <div className="relative rounded-[28px] border-2 border-amber-300/80 bg-gradient-to-b from-amber-50 to-amber-100 p-2 text-rose-950 shadow-2xl">
                <div className="bg-jali-light rounded-[22px] border border-amber-600/40 px-6 py-8 text-center">
                  <RingsIcon className="mx-auto h-14 w-14 text-amber-600" />
                  <p lang="ur" dir="rtl" className="font-urdu mt-3 text-4xl font-bold text-rose-900">رشتہ بیورو</p>
                  <p className="mt-1 text-xs font-semibold tracking-[0.35em] text-amber-700">RISHTA BUREAU</p>
                  <OrnamentDivider className="my-4" />
                  <p className="font-serif text-lg italic text-rose-900">“Jahan rishtay bharose se jurtay hain”</p>
                  <ul className="mt-5 space-y-2 text-left text-sm font-medium text-rose-900">
                    {["CNIC & selfie verified", "Photo privacy you control", "Respectful, moderated chats"].map((t) => (
                      <li key={t} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-600" /> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---------------- TRUST STRIP ---------------- */}
      <section className="bg-rose-950 text-amber-200">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-3 px-4 py-4 text-sm sm:px-6 md:grid-cols-4">
          {trust.map((t) => (
            <p key={t.text} className="flex items-center justify-center gap-2 text-center md:justify-start">
              <t.icon className="h-5 w-5 shrink-0 text-amber-400" /> {t.text}
            </p>
          ))}
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {/* ---------------- WHO IT IS FOR ---------------- */}
        <SectionHeading eyebrow="Rishta ki talaash" title="Who are you looking for?" subtitle="Create your profile and we will show you the profiles that fit your wishes." />
        <div className="grid gap-4 md:grid-cols-3">
          {audiences.map((a) => (
            <div key={a.title} className="rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-800 ring-2 ring-amber-300">
                <a.icon className="h-7 w-7" />
              </span>
              <p lang="ur" dir="rtl" className="font-urdu mt-3 text-2xl font-bold text-rose-900">{a.ur}</p>
              <h3 className="font-serif text-lg font-semibold text-stone-900">{a.title}</h3>
              <p className="mt-2 text-sm text-stone-600">{a.text}</p>
              <LinkButton href="/register" variant="outline" size="sm" className="mt-4">Create profile</LinkButton>
            </div>
          ))}
        </div>

        {/* ---------------- HOW IT WORKS ---------------- */}
        <div className="mt-16 sm:mt-20">
          <SectionHeading eyebrow="Simple steps" title="How it works" subtitle="Four steps from sign-up to a respectful introduction." />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.title} className="relative rounded-2xl bg-white p-6 pt-9 text-center shadow-sm ring-1 ring-stone-200">
                <span className="absolute -top-5 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 font-serif text-lg font-bold text-rose-950 shadow">
                  {i + 1}
                </span>
                <s.icon className="mx-auto mb-3 h-7 w-7 text-rose-800" />
                <h3 className="font-semibold text-stone-900">{s.title}</h3>
                <p className="mt-1 text-sm text-stone-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ---------------- FEATURES ---------------- */}
        <div className="mt-16 sm:mt-20">
          <SectionHeading eyebrow="Aitemaad" title="Why families choose us" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-stone-200 border-t-4 border-t-amber-400 bg-white p-5 shadow-sm">
                <f.icon className="mb-3 h-7 w-7 text-rose-800" />
                <h3 className="font-semibold text-stone-900">{f.title}</h3>
                <p className="mt-1 text-sm text-stone-600">{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ---------------- GALLERY (only when the admin has added images) ---------------- */}
        {gallery.length > 0 && (
          <div className="mt-16 sm:mt-20">
            <SectionHeading eyebrow="Hamari tasveerein" title="Our families" />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {gallery.map((g) => (
                <figure key={g.id} className="overflow-hidden rounded-2xl border-2 border-amber-300 bg-white p-1 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cmsMediaUrl(g.image_path)} alt={g.title ?? ""} loading="lazy" className="aspect-[4/5] w-full rounded-xl object-cover" />
                  {(g.title || g.subtitle) && (
                    <figcaption className="px-2 py-2 text-center">
                      {g.title && <p className="font-serif text-sm font-semibold text-rose-950">{g.title}</p>}
                      {g.subtitle && <p className="text-xs text-stone-500">{g.subtitle}</p>}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        )}

        {/* ---------------- PRICING ---------------- */}
        {plans.length > 0 && (
          <div className="mt-16 sm:mt-20">
            <SectionHeading eyebrow="Packages" title="Simple pricing" />
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((p) => (
                <PlanCard key={p.id} plan={p} action={<LinkButton href="/register" variant="outline" className="w-full">Get started</LinkButton>} />
              ))}
            </div>
          </div>
        )}

        {/* ---------------- FAQ ---------------- */}
        <div id="faq" className="mt-16 scroll-mt-24 sm:mt-20">
          <SectionHeading eyebrow="Sawal jawab" title="Questions families ask" />
          <div className="mx-auto max-w-3xl space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-xl border border-stone-200 bg-white p-4 shadow-sm open:border-amber-300 open:shadow-md">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-stone-900">
                  {f.q}
                  <ChevronDown className="h-5 w-5 shrink-0 text-amber-600 transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-stone-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* ---------------- FINAL CALL TO ACTION ---------------- */}
        <div className="relative mt-16 overflow-hidden rounded-3xl bg-gradient-to-br from-rose-950 via-rose-900 to-rose-800 p-8 text-center text-white sm:mt-20 sm:p-12">
          <div className="bg-jali absolute inset-0" />
          <div className="relative">
            <RingsIcon className="mx-auto h-12 w-12 text-amber-300" />
            <h2 className="mt-3 font-serif text-2xl font-bold sm:text-3xl">Ready to start your rishta journey?</h2>
            <OrnamentDivider light className="my-4" />
            <p className="mx-auto max-w-xl text-rose-100">
              Create your profile in a few minutes. Our team will verify it and you can start seeing matches.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <LinkButton href="/register" size="lg" className="w-full bg-amber-400 text-rose-950 hover:bg-amber-300 sm:w-auto">
                Create your profile
              </LinkButton>
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
        </div>
      </div>
    </>
  );
}
