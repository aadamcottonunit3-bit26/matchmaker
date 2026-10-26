import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRequestInfo } from "@/lib/request-info";

/** Append-only trail of sensitive admin actions (CNIC views, chat reads, ...). */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  meta: Record<string, unknown> = {}
) {
  const info = await getRequestInfo();
  await createAdminClient().from("admin_audit_logs").insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    meta,
    ip_address: info.ip,
  });
}

export async function namesFor(ids: string[]) {
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) return new Map<string, string>();
  const { data } = await createAdminClient().from("profiles").select("id, full_name").in("id", unique);
  return new Map((data ?? []).map((p) => [p.id as string, p.full_name as string]));
}
