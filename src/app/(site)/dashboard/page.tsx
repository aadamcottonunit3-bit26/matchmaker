import Link from "next/link";
import { requireMe, isActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rankMatches } from "@/lib/matching";
import { ageLabelFromYears } from "@/lib/age";
import type { Profile } from "@/lib/types";
import { Alert, Card, EmptyState, LinkButton, PageContainer, PageTitle } from "@/components/ui";
import { ProfileCard } from "@/components/ProfileCard";
import { formatDay } from "@/lib/utils";

export const metadata = { title: "Your matches" };

function StatusBanner({ me }: { me: Profile }) {
  switch (me.status) {
    case "pending":
      return (
        <Alert tone="warn">
          <b>Your profile is under review.</b> Our team is checking your CNIC and photo. You will see matches as soon as it is verified.
        </Alert>
      );
    case "rejected":
      return <Alert tone="error"><b>Your profile was not approved.</b> Please contact support to resubmit your documents.</Alert>;
    case "banned":
      return <Alert tone="error"><b>Your profile is restricted.</b> Please contact support for details.</Alert>;
    case "expired":
      return (
        <Alert tone="warn">
          <b>Your membership expired{me.valid_until ? ` on ${formatDay(me.valid_until)}` : ""}.</b>{" "}
          <Link href="/billing" className="font-semibold underline">Renew your plan</Link> to see matches again.
        </Alert>
      );
    default:
      return null;
  }
}

export default async function DashboardPage() {
  const me = await requireMe();
  const active = isActiveMember(me);

  let matches: ReturnType<typeof rankMatches<Profile>> = [];
  if (active) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("match_candidates", { p_limit: 200 });
    matches = rankMatches(me, (data as Profile[]) ?? []);
  }

  return (
    <PageContainer>
      <PageTitle title={`Assalam-o-Alaikum, ${me.full_name.split(" ")[0]}`} subtitle={ageLabelFromYears(me.age_years)} />
      <div className="mb-6 space-y-3">
        <StatusBanner me={me} />
        {active && me.valid_until && (
          <p className="text-sm text-stone-600">Membership valid until <b>{formatDay(me.valid_until)}</b>.</p>
        )}
      </div>

      {active ? (
        matches.length > 0 ? (
          <>
            <h2 className="mb-4 text-xl font-semibold">Recommended matches ({matches.length})</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {matches.map((m) => (
                <ProfileCard key={m.profile.id} profile={m.profile} percent={m.percent} />
              ))}
            </div>
          </>
        ) : (
          <EmptyState>
            <p className="mb-3">No matches yet that fit your age, city and marital-status preferences.</p>
            <LinkButton href="/my-profile" variant="outline">Widen your preferences</LinkButton>
          </EmptyState>
        )
      ) : (
        <Card>
          <p className="text-stone-700">Matches appear here once your profile is verified and your membership is active.</p>
        </Card>
      )}
    </PageContainer>
  );
}
