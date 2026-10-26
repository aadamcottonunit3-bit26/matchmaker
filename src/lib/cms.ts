import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Plan } from "@/lib/types";

export function cmsMediaUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/cms-media/${path}`;
}

export async function getSliders() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cms_sliders")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
}

export async function getPlans(): Promise<Plan[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("plans").select("*").eq("is_active", true).order("sort_order");
  return (data as Plan[]) ?? [];
}

export async function getPage(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("cms_pages").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
  return data;
}
