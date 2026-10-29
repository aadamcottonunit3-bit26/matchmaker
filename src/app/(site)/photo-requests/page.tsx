import Link from "next/link";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDisplayNames } from "@/lib/public-profiles";
import { formatDate, labelize } from "@/lib/utils";
import { Badge, Button, Card, EmptyState, PageContainer, PageTitle } from "@/components/ui";
import { respondPhotoRequest } from "./actions";

export const metadata = { title: "Photo requests" };

export default async function PhotoRequestsPage() {
  const me = await requireMe();
  const supabase = await createClient();

  const [{ data: incoming }, { data: outgoing }] = await Promise.all([
    supabase.from("photo_requests").select("id, status, created_at, requester_id").eq("owner_id", me.id).order("created_at", { ascending: false }),
    supabase.from("photo_requests").select("id, status, created_at, owner_id").eq("requester_id", me.id).order("created_at", { ascending: false }),
  ]);

  // Names are looked up on the server for people the member already has a request with
  const ids = [...(incoming ?? []).map((r) => r.requester_id), ...(outgoing ?? []).map((r) => r.owner_id)];
  const people = await getDisplayNames(ids);
  const name = (id: string) => people.get(id) ?? "Member";

  return (
    <PageContainer className="max-w-3xl">
      <PageTitle title="Photo requests" subtitle="Approve who can see your private photo." />

      <h2 className="mb-3 text-lg font-semibold">Requests to you</h2>
      {incoming && incoming.length > 0 ? (
        <div className="mb-8 space-y-3">
          {incoming.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href={`/profile/${r.requester_id}`} className="font-medium text-rose-700 hover:underline">{name(r.requester_id)}</Link>
                <p className="text-xs text-stone-500">{formatDate(r.created_at)}</p>
              </div>
              {r.status === "pending" ? (
                <form action={respondPhotoRequest} className="flex gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <Button name="decision" value="approve" variant="success" size="sm">Approve</Button>
                  <Button name="decision" value="reject" variant="secondary" size="sm">Decline</Button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge tone={r.status === "approved" ? "green" : "red"}>{labelize(r.status)}</Badge>
                  <form action={respondPhotoRequest}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button name="decision" value={r.status === "approved" ? "reject" : "approve"} variant="ghost" size="sm">
                      {r.status === "approved" ? "Revoke" : "Approve"}
                    </Button>
                  </form>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="mb-8"><EmptyState>No one has requested your photo yet.</EmptyState></div>
      )}

      <h2 className="mb-3 text-lg font-semibold">Your requests</h2>
      {outgoing && outgoing.length > 0 ? (
        <div className="space-y-3">
          {outgoing.map((r) => (
            <Card key={r.id} className="flex items-center justify-between">
              <Link href={`/profile/${r.owner_id}`} className="font-medium text-rose-700 hover:underline">{name(r.owner_id)}</Link>
              <Badge tone={r.status === "approved" ? "green" : r.status === "pending" ? "yellow" : "red"}>{labelize(r.status)}</Badge>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState>You have not requested any photos.</EmptyState>
      )}
    </PageContainer>
  );
}
