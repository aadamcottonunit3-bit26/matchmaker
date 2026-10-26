import Link from "next/link";
import {
  Ban, CheckCircle2, Clock, Flag, HandCoins, Hourglass, UserCheck, Users, Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { loadPrivate } from "@/lib/admin-members";
import { formatPKR } from "@/lib/utils";
import { AdminMemberCard } from "@/components/admin/AdminMemberCard";
import { StatCard } from "@/components/admin/StatCard";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Admin" };

export default async function AdminHome() {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const members = () => supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "member");

  const [pending, active, expired, banned, payments, total, reports, approved, latest] = await Promise.all([
    count(members().eq("status", "pending")),
    count(members().eq("status", "verified").or(`valid_until.is.null,valid_until.gt.${nowIso}`)),
    count(members().or(`status.eq.expired,and(status.eq.verified,valid_until.lt.${nowIso})`)),
    count(members().eq("status", "banned")),
    count(supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending")),
    count(members()),
    count(supabase.from("profile_reports").select("id", { count: "exact", head: true }).eq("status", "open")),
    supabase.from("payments").select("amount_pkr").eq("status", "approved").limit(5000),
    supabase.from("profiles").select("*").eq("role", "member").eq("status", "pending").order("created_at", { ascending: false }).limit(5),
  ]);

  const revenue = (approved.data ?? []).reduce((sum, r) => sum + Number(r.amount_pkr ?? 0), 0);
  const latestRows = (latest.data ?? []) as Profile[];
  const priv = await loadPrivate(supabase, latestRows.map((r) => r.id));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="rounded-2xl bg-gradient-to-r from-teal-800 to-teal-700 p-5 text-white shadow-sm sm:p-7">
        <h1 className="text-2xl font-bold sm:text-3xl">Welcome, {admin.full_name.split(" ")[0] || "Admin"}!</h1>
        <p className="mt-1 text-teal-100">Rishta Bureau · Admin dashboard</p>
        {pending > 0 && (
          <Link
            href="/admin/profiles?tab=pending"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/25"
          >
            <Hourglass className="h-4 w-4" /> {pending} new profile{pending > 1 ? "s" : ""} waiting for review
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Hourglass} tone="amber" label="Under process" value={pending} href="/admin/profiles?tab=pending" />
        <StatCard icon={UserCheck} tone="green" label="Active members" value={active} href="/admin/profiles?tab=verified" />
        <StatCard icon={Clock} tone="orange" label="Expired members" value={expired} href="/admin/profiles?tab=expired" />
        <StatCard icon={Ban} tone="red" label="Banned members" value={banned} href="/admin/profiles?tab=banned" />
        <StatCard icon={Wallet} tone="blue" label="Payments to approve" value={payments} href="/admin/payments?tab=pending" />
        <StatCard icon={HandCoins} tone="purple" label="Approved payments" value={formatPKR(revenue)} href="/admin/payments" />
        <StatCard icon={Flag} tone="red" label="Open reports" value={reports} href="/admin/reports" />
        <StatCard icon={Users} tone="teal" label="Total members" value={total} href="/admin/profiles?tab=all" />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900">
            <CheckCircle2 className="h-5 w-5 text-teal-700" /> Latest requests
          </h2>
          <Link href="/admin/profiles?tab=pending" className="text-sm font-medium text-teal-700 hover:underline">View all</Link>
        </div>
        {latestRows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-500">
            No profiles are waiting for review.
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {latestRows.map((p) => (
              <AdminMemberCard key={p.id} p={p} priv={priv.get(p.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
