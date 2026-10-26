import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Number of verified members, for the home page. A bare number only; no personal data leaves the server. */
export async function getVerifiedMemberCount(): Promise<number> {
  try {
    const { count } = await createAdminClient()
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "member")
      .eq("status", "verified");
    return count ?? 0;
  } catch {
    return 0;
  }
}
