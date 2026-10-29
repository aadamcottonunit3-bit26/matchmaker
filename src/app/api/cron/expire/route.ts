import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function validSecret(header: string | null) {
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Vercel Cron: marks members whose validity ended as 'expired'. Protected by CRON_SECRET. */
export async function GET(req: Request) {
  if (!validSecret(req.headers.get("authorization"))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("expire_profiles");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // ages change on birthdays: keep profiles.age_years current (a failure here must not hide the expiry result)
  const { data: aged } = await admin.rpc("refresh_ages");
  // housekeeping: old rate-limit counters (no-ops before migration 0008)
  const { data: purged } = await admin.rpc("purge_rate_limits");
  return NextResponse.json({ expired: data, agesUpdated: aged ?? null, rateLimitsPurged: purged ?? null });
}
