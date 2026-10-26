import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Vercel Cron: marks members whose validity ended as 'expired'. Protected by CRON_SECRET. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const { data, error } = await createAdminClient().rpc("expire_profiles");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ expired: data });
}
