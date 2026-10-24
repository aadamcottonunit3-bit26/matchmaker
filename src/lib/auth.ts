import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Current auth user (validated against Supabase Auth). */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Current user's profile row (RLS: own row). */
export const getMe = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (data as Profile | null) ?? null;
});

export async function requireMe(): Promise<Profile> {
  const user = await getUser();
  if (!user) redirect("/login");
  const me = await getMe();
  if (!me) redirect("/login");
  return me;
}

export async function requireAdmin(): Promise<Profile> {
  const me = await requireMe();
  if (me.role !== "admin") redirect("/dashboard");
  return me;
}

/** Verified + subscription still valid. */
export function isActiveMember(p: Profile) {
  return (
    p.status === "verified" && (!p.valid_until || new Date(p.valid_until) > new Date())
  );
}
