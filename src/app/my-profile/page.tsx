import { BadgeCheck } from "lucide-react";
import { requireMe } from "@/lib/auth";
import { ageLabel } from "@/lib/age";
import { formatDay, labelize } from "@/lib/utils";
import { Badge, PageContainer, PageTitle } from "@/components/ui";
import { EditForm } from "./EditForm";

export const metadata = { title: "My profile" };

export default async function MyProfilePage() {
  const me = await requireMe();
  const tone = me.status === "verified" ? "green" : me.status === "pending" ? "yellow" : "red";
  return (
    <PageContainer className="max-w-3xl">
      <PageTitle title="My profile" subtitle={ageLabel(me.dob)} />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={tone}>Status: {labelize(me.status)}</Badge>
        {me.is_verified && <Badge tone="green"><BadgeCheck className="h-3.5 w-3.5" /> Verified</Badge>}
        {me.valid_until && <Badge tone="gray">Valid until {formatDay(me.valid_until)}</Badge>}
      </div>
      <EditForm profile={me} />
    </PageContainer>
  );
}
