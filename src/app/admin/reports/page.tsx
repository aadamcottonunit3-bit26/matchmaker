import Link from "next/link";
import { Flag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { namesFor } from "@/lib/admin";
import { REPORT_REASONS } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils";
import { SubmitButton } from "@/components/SubmitButton";
import { resolveReport } from "./actions";

export const metadata = { title: "Admin · Reports" };

const TABS = [
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
];

type Report = {
  id: string; reporter_id: string; reported_id: string; reason: string;
  details: string | null; status: string; created_at: string;
};

export default async function AdminReports({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: rawTab } = await searchParams;
  const tab = rawTab === "resolved" ? "resolved" : "open";
  const supabase = await createClient();

  const { data } = await supabase
    .from("profile_reports")
    .select("*")
    .eq("status", tab)
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Report[];
  const names = await namesFor(rows.flatMap((r) => [r.reporter_id, r.reported_id]));
  const reasonLabel = (v: string) => REPORT_REASONS.find((r) => r.value === v)?.label ?? v;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <h1 className="mb-4 flex items-center gap-2 text-2xl font-bold text-stone-900">
        <Flag className="h-6 w-6 text-red-600" /> Reports
      </h1>

      <div className="mb-5 flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/reports?tab=${t.key}`}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium",
              tab === t.key ? "border-teal-900 bg-teal-900 text-white" : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-stone-500">
          No {tab} reports.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold text-stone-900">{reasonLabel(r.reason)}</p>
                <span className="text-xs text-stone-500">{formatDate(r.created_at)}</span>
              </div>
              {r.details && <p className="mt-2 whitespace-pre-line rounded-lg bg-stone-50 p-3 text-sm text-stone-700">{r.details}</p>}
              <p className="mt-3 text-sm text-stone-600">
                Reported profile:{" "}
                <Link href={`/admin/profiles/${r.reported_id}`} className="font-semibold text-teal-700 hover:underline">
                  {names.get(r.reported_id) ?? "Unknown"}
                </Link>
                <br />
                Reported by:{" "}
                <Link href={`/admin/profiles/${r.reporter_id}`} className="font-medium text-stone-800 hover:underline">
                  {names.get(r.reporter_id) ?? "Unknown"}
                </Link>
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  href={`/admin/profiles/${r.reported_id}`}
                  className="flex items-center justify-center rounded-lg border border-teal-800 bg-teal-800 px-3 py-2.5 text-sm font-medium text-white hover:bg-teal-900"
                >
                  Open profile
                </Link>
                {r.status === "open" ? (
                  <form action={resolveReport}>
                    <input type="hidden" name="id" value={r.id} />
                    <SubmitButton variant="secondary" className="w-full" pendingText="Saving…">Mark resolved</SubmitButton>
                  </form>
                ) : (
                  <span className="flex items-center justify-center rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700">Resolved</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
