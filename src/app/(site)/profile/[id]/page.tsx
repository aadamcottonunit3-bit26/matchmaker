import { notFound, redirect } from "next/navigation";
import { BadgeCheck, Bookmark, BookmarkCheck, Flag, Lock, MessageCircle } from "lucide-react";
import { requireMe, isActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRequestInfo } from "@/lib/request-info";
import { scoreMatch } from "@/lib/matching";
import { ageLabelFromYears } from "@/lib/age";
import { formatPKR, labelize } from "@/lib/utils";
import {
  BODY_TYPES, MARRIAGE_TIMELINE, MOTHER_TONGUES, PERSONALITY_TRAITS, REPORT_REASONS, SKIN_TONES, optionLabel,
} from "@/lib/constants";
import { formatHeight } from "@/lib/height";
import { incomeRangeLabel } from "@/lib/income";
import type { Profile } from "@/lib/types";
import { Alert, Badge, Card, Label, PageContainer, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { ProfilePhoto } from "@/components/ProfileCard";
import { reportProfile, requestPhoto, startConversation, toggleShortlist } from "./actions";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-stone-100 py-2 text-sm last:border-0">
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-right font-medium text-stone-900">{value || "—"}</dd>
    </div>
  );
}

export async function generateMetadata() {
  return { title: "Profile" };
}

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireMe();
  if (id === me.id) redirect("/my-profile");

  const active = isActiveMember(me) || me.role === "admin";
  if (!active) redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  const profile = data as Profile | null;
  if (!profile) notFound();

  // Activity log: who viewed whom (written server-side with the service role)
  if (me.role !== "admin") {
    const info = await getRequestInfo();
    await createAdminClient().from("profile_views").insert({
      viewer_id: me.id,
      viewed_id: profile.id,
      ip_address: info.ip,
      user_agent: info.ua,
      device: info.device,
    });
  }

  const { data: reqRow } = await supabase
    .from("photo_requests")
    .select("status")
    .eq("requester_id", me.id)
    .eq("owner_id", profile.id)
    .maybeSingle();

  const [{ data: savedRow }, { data: reportRow }] =
    me.role === "admin"
      ? [{ data: null }, { data: null }]
      : await Promise.all([
          supabase.from("shortlists").select("profile_id").eq("user_id", me.id).eq("profile_id", profile.id).maybeSingle(),
          supabase.from("profile_reports").select("id").eq("reporter_id", me.id).eq("reported_id", profile.id).maybeSingle(),
        ]);

  const match = me.role === "admin" ? null : scoreMatch(me, profile);
  const photoLocked = profile.blur_photo && reqRow?.status !== "approved";

  return (
    <PageContainer className="max-w-4xl">
      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <div className="aspect-[3/4] overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
            <ProfilePhoto profile={profile} />
          </div>

          {photoLocked && me.role !== "admin" && (
            <Card className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-medium"><Lock className="h-4 w-4" /> This photo is private</p>
              {!reqRow && (
                <form action={requestPhoto}>
                  <input type="hidden" name="owner_id" value={profile.id} />
                  <SubmitButton className="w-full" pendingText="Sending…">Request photo</SubmitButton>
                </form>
              )}
              {reqRow?.status === "pending" && <Alert tone="info">Photo request sent. Waiting for approval.</Alert>}
              {reqRow?.status === "rejected" && <Alert tone="error">The member declined your photo request.</Alert>}
            </Card>
          )}

          {me.role !== "admin" && (
            <>
              <form action={startConversation}>
                <input type="hidden" name="other_id" value={profile.id} />
                <SubmitButton className="w-full" pendingText="Opening chat…">
                  <MessageCircle className="h-4 w-4" /> Send message
                </SubmitButton>
              </form>

              <form action={toggleShortlist}>
                <input type="hidden" name="profile_id" value={profile.id} />
                <SubmitButton variant={savedRow ? "outline" : "secondary"} className="w-full" pendingText="Saving…">
                  {savedRow ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  {savedRow ? "Saved to shortlist" : "Save to shortlist"}
                </SubmitButton>
              </form>

              {reportRow ? (
                <p className="text-center text-xs text-stone-500">You reported this profile. Our team will review it.</p>
              ) : (
                <details className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
                  <summary className="flex cursor-pointer items-center justify-center gap-2 font-medium text-stone-600 hover:text-red-700">
                    <Flag className="h-4 w-4" /> Report this profile
                  </summary>
                  <form action={reportProfile} className="mt-3 space-y-3">
                    <input type="hidden" name="reported_id" value={profile.id} />
                    <div>
                      <Label>Reason</Label>
                      <Select name="reason" required placeholder="Select a reason…" options={REPORT_REASONS} />
                    </div>
                    <div>
                      <Label>Details (optional)</Label>
                      <Textarea name="details" maxLength={1000} placeholder="Tell us what happened." />
                    </div>
                    <SubmitButton variant="danger" className="w-full" pendingText="Sending…">Send report</SubmitButton>
                  </form>
                </details>
              )}
            </>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
              {profile.full_name}
              {profile.is_verified && (
                <Badge tone="green"><BadgeCheck className="h-3.5 w-3.5" /> Verified</Badge>
              )}
            </h1>
            <p className="text-stone-600">{ageLabelFromYears(profile.age_years)}</p>
            {profile.reg_no && <p className="mt-0.5 font-mono text-xs text-stone-500">ID: {profile.reg_no}</p>}
            {match && (
              <p className="mt-2 inline-block rounded-lg bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-800">
                {match.percent}% compatibility with your preferences
              </p>
            )}
          </div>

          {profile.about && (
            <Card>
              <h2 className="mb-2 font-semibold">About</h2>
              <p className="whitespace-pre-line text-sm text-stone-700">{profile.about}</p>
            </Card>
          )}

          <Card>
            <h2 className="mb-2 font-semibold">Details</h2>
            <dl>
              <Row label="Marital status" value={labelize(profile.marital_status)} />
              <Row label="City" value={profile.city} />
              <Row label="Education" value={labelize(profile.education)} />
              <Row label="Profession" value={profile.profession} />
              <Row label="Monthly income" value={profile.monthly_income_pkr ? formatPKR(profile.monthly_income_pkr) : null} />
              <Row label="Family background" value={labelize(profile.family_background)} />
              {profile.children_count !== null && (
                <Row label="Children" value={profile.children_count === 0 ? "No children" : profile.children_count >= 6 ? "6 or more" : String(profile.children_count)} />
              )}
              <Row label="Height" value={formatHeight(profile.height_cm)} />
              <Row label="Weight" value={profile.weight_kg ? `${profile.weight_kg} kg` : null} />
              <Row label="Body type" value={optionLabel(BODY_TYPES, profile.body_type)} />
              <Row label="Skin tone" value={optionLabel(SKIN_TONES, profile.skin_tone)} />
              <Row label="Mother tongue" value={optionLabel(MOTHER_TONGUES, profile.mother_tongue)} />
              <Row label="Sect" value={profile.sect ? labelize(profile.sect) : null} />
              <Row label="Wants to marry" value={MARRIAGE_TIMELINE.find((o) => o.value === profile.marriage_timeline)?.label} />
            </dl>
          </Card>

          {((profile.personality ?? []).length > 0 || profile.hobbies) && (
            <Card>
              <h2 className="mb-2 font-semibold">Personality &amp; interests</h2>
              {(profile.personality ?? []).length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {profile.personality.map((t) => (
                    <Badge key={t} tone="rose">{optionLabel(PERSONALITY_TRAITS, t) ?? t}</Badge>
                  ))}
                </div>
              )}
              {profile.hobbies && <p className="text-sm text-stone-700"><b>Hobbies:</b> {profile.hobbies}</p>}
            </Card>
          )}

          {Object.keys(profile.lifestyle ?? {}).length > 0 && (
            <Card>
              <h2 className="mb-2 font-semibold">Lifestyle</h2>
              <dl>
                {Object.entries(profile.lifestyle).map(([k, v]) => (
                  <Row key={k} label={labelize(k)} value={labelize(v)} />
                ))}
              </dl>
            </Card>
          )}

          <Card>
            <h2 className="mb-2 font-semibold">Looking for</h2>
            <dl>
              <Row label="Age" value={`${profile.pref_age_min} – ${profile.pref_age_max}`} />
              <Row label="Marital status" value={profile.pref_marital.map(labelize).join(", ")} />
              <Row label="Cities" value={profile.preferred_cities.join(", ")} />
              <Row label="Education" value={labelize(profile.pref_education)} />
              <Row label="Profession" value={profile.pref_profession} />
              <Row label="Monthly income" value={incomeRangeLabel(profile.pref_income_min_pkr, profile.pref_income_max_pkr)} />
            </dl>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
