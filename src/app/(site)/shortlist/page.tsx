import { redirect } from "next/navigation";
import { requireMe, isActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getShortlisted } from "@/lib/public-profiles";
import { EmptyState, LinkButton, PageContainer, PageTitle } from "@/components/ui";
import { ProfileCard } from "@/components/ProfileCard";

export const metadata = { title: "Shortlist" };

export default async function ShortlistPage() {
  const me = await requireMe();
  if (!isActiveMember(me)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: saved } = await supabase
    .from("shortlists")
    .select("profile_id, created_at")
    .eq("user_id", me.id)
    .order("created_at", { ascending: false });

  const ids = (saved ?? []).map((r) => r.profile_id as string);
  const profiles = await getShortlisted(ids);

  return (
    <PageContainer>
      <PageTitle title="Your shortlist" subtitle="Profiles you saved to look at again." />
      {profiles.length === 0 ? (
        <EmptyState>
          <p className="mb-3">You have not saved any profiles yet.</p>
          <LinkButton href="/dashboard" variant="outline">Browse matches</LinkButton>
        </EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <ProfileCard key={p.id} profile={p} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
