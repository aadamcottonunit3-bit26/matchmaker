import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Vercel Cron: marks members whose validity ended as 'expired'. Protected by CRON_SECRET. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("expire_profiles");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // ages change on birthdays: keep profiles.age_years current (a failure here must not hide the expiry result)
  const { data: aged } = await admin.rpc("refresh_ages");
  return NextResponse.json({ expired: data, agesUpdated: aged ?? null });
}
