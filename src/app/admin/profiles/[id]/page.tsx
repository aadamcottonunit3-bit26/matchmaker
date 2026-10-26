import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/storage";
import { logAdminAction } from "@/lib/admin";
import { ageLabel } from "@/lib/age";
import { toIntlDigits } from "@/lib/contact";
import { MARRIAGE_TIMELINE } from "@/lib/constants";
import { formatDate, formatDay, formatPKR, labelize } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { Alert, Badge, Card, Label, PageContainer, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { banProfile, unbanProfile, verifyProfile } from "./actions";

export const metadata = { title: "Admin · Review profile" };

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-stone-100 py-1.5 text-sm last:border-0">
      <span className="text-stone-500">{k}</span>
      <span className="text-right font-medium">{v || "—"}</span>
    </div>
  );
}

export default async function AdminProfileReview({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  const p = data as Profile | null;
  if (!p) notFound();

  const [{ data: priv }, { data: history }] = await Promise.all([
    supabase.from("profile_private").select("*").eq("profile_id", id).maybeSingle(),
    supabase.from("moderation_log").select("*").eq("profile_id", id).order("created_at", { ascending: false }),
  ]);

  const [front, back, selfie] = await Promise.all([
    signedUrl("cnic-documents", priv?.cnic_front_path),
    signedUrl("cnic-documents", priv?.cnic_back_path),
    signedUrl("cnic-documents", priv?.selfie_path),
  ]);
  const waDigits = toIntlDigits(priv?.phone);
  if (priv) await logAdminAction(admin.id, "view_cnic", "profile", id);

  return (
    <PageContainer className="max-w-5xl px-4 py-6">
      <Link href="/admin/profiles" className="text-sm font-medium text-teal-700 hover:underline">← Back to members</Link>
      <div className="mb-6 mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{p.full_name}</h1>
        {p.is_verified && <Badge tone="green"><BadgeCheck className="h-3.5 w-3.5" /> Verified</Badge>}
        <Badge tone={p.status === "verified" ? "green" : p.status === "pending" ? "yellow" : "red"}>{labelize(p.status)}</Badge>
      </div>

      <div className="mb-4 space-y-2">
        {sp.ok && <Alert tone="success">{sp.ok}</Alert>}
        {sp.err && <Alert tone="error">{sp.err}</Alert>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-2 font-semibold">Profile</h2>
            <Row k="Registration no." v={p.reg_no} />
            <Row k="Age" v={ageLabel(p.dob)} />
            <Row k="Gender" v={labelize(p.gender)} />
            <Row k="Marital status" v={labelize(p.marital_status)} />
            <Row k="City" v={p.city} />
            <Row k="Education" v={labelize(p.education)} />
            <Row k="Profession" v={p.profession} />
            <Row k="Income" v={p.monthly_income_pkr ? formatPKR(p.monthly_income_pkr) : null} />
            <Row k="Family" v={labelize(p.family_background)} />
            <Row k="Height" v={p.height_cm ? `${p.height_cm} cm` : null} />
            <Row k="Sect" v={p.sect ? labelize(p.sect) : null} />
            <Row k="Wants to marry" v={MARRIAGE_TIMELINE.find((o) => o.value === p.marriage_timeline)?.label} />
            <Row k="Registered" v={formatDate(p.created_at)} />
            <Row k="Valid until" v={formatDay(p.valid_until)} />
            <Row k="Photo blurred" v={p.blur_photo ? "Yes" : "No"} />
          </Card>

          <Card>
            <h2 className="mb-2 font-semibold">Private details (admin only)</h2>
            <Row k="CNIC number" v={priv?.cnic_number} />
            <Row k="Phone" v={priv?.phone} />
            {priv?.phone && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a href={`tel:${priv.phone.replace(/[^\d+]/g, "")}`} className="flex items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">Call</a>
                {waDigits && <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer" className="flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">WhatsApp</a>}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">Moderation history</h2>
            {(history ?? []).length === 0 && <p className="text-sm text-stone-500">No actions yet.</p>}
            <ul className="space-y-2 text-sm">
              {(history ?? []).map((h) => (
                <li key={h.id} className="rounded-lg bg-stone-50 p-2.5">
                  <b className="uppercase">{h.action}</b> · {formatDate(h.created_at)}
                  <p className="text-stone-600">{h.reason}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-semibold">Photo &amp; CNIC verification</h2>
            <div className="grid grid-cols-2 gap-3">
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/photos/${p.id}`} alt="Profile photo" className="aspect-[3/4] w-full rounded-lg object-cover" />
                <figcaption className="mt-1 text-center text-xs text-stone-500">Profile photo</figcaption>
              </figure>
              <div className="space-y-3">
                {front ? (
                  <a href={front} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={front} alt="CNIC front" className="w-full rounded-lg border" />
                    <span className="text-xs text-stone-500">CNIC front (click to enlarge)</span>
                  </a>
                ) : <p className="text-sm text-stone-500">No CNIC front</p>}
                {back ? (
                  <a href={back} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={back} alt="CNIC back" className="w-full rounded-lg border" />
                    <span className="text-xs text-stone-500">CNIC back (click to enlarge)</span>
                  </a>
                ) : <p className="text-sm text-stone-500">No CNIC back</p>}
                {selfie ? (
                  <a href={selfie} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selfie} alt="Selfie holding CNIC" className="w-full rounded-lg border" />
                    <span className="text-xs text-stone-500">Selfie with CNIC (click to enlarge)</span>
                  </a>
                ) : <p className="text-sm text-stone-500">No selfie with CNIC</p>}
              </div>
            </div>
            <p className="mt-3 text-xs text-stone-500">Links expire after 5 minutes. Opening CNIC documents is recorded in the audit log.</p>
          </Card>

          {p.status === "pending" && (
            <Card>
              <h2 className="mb-2 font-semibold">Verify profile</h2>
              <p className="mb-3 text-sm text-stone-600">Confirm the CNIC matches the profile details and the photo. This assigns the green verified tick and moves the profile to the Verified tab.</p>
              <form action={verifyProfile}>
                <input type="hidden" name="id" value={p.id} />
                <SubmitButton variant="success" pendingText="Verifying…">✓ Verify &amp; approve</SubmitButton>
              </form>
            </Card>
          )}

          {p.status !== "banned" ? (
            <Card>
              <h2 className="mb-2 font-semibold">Ban / block profile</h2>
              <form action={banProfile} className="space-y-3">
                <input type="hidden" name="id" value={p.id} />
                <div>
                  <Label>Reason (required, stored in the log)</Label>
                  <Textarea name="reason" required minLength={5} placeholder="e.g. Fake CNIC documents" />
                </div>
                <SubmitButton variant="danger" pendingText="Banning…">Ban profile</SubmitButton>
              </form>
            </Card>
          ) : (
            <Card>
              <h2 className="mb-2 font-semibold">Unblock profile</h2>
              <form action={unbanProfile} className="space-y-3">
                <input type="hidden" name="id" value={p.id} />
                <div>
                  <Label>Reason for unblocking (required)</Label>
                  <Textarea name="reason" required minLength={5} />
                </div>
                <SubmitButton pendingText="Unblocking…">Unblock profile</SubmitButton>
              </form>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
