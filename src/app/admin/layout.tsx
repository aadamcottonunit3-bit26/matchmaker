import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";

const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const [profiles, payments, reports] = await Promise.all([
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending").eq("role", "member")),
    count(supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending")),
    // Before migration 0002 this table does not exist: the query just returns no count (0).
    count(supabase.from("profile_reports").select("id", { count: "exact", head: true }).eq("status", "open")),
  ]);

  return (
    <AdminShell adminName={admin.full_name} badges={{ profiles, payments, reports }}>
      {children}
    </AdminShell>
  );
}
