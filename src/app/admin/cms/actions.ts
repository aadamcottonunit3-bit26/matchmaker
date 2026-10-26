"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { extOf, uploadImage, validateImage } from "@/lib/storage";
import { numOrNull, strOrNull } from "@/lib/validators";

function done(tab: string) {
  revalidatePath("/");
  revalidatePath("/pricing");
  revalidatePath("/billing");
  revalidatePath(`/admin/cms`);
  return tab;
}

/* ---------- Sliders ---------- */
export async function createSlider(fd: FormData) {
  await requireAdmin();
  const image = fd.get("image") as File | null;
  if (validateImage(image, "Image")) return;
  const placement = fd.get("placement") === "gallery" ? "gallery" : "hero";
  const path = `sliders/${Date.now()}.${extOf(image!)}`;
  await uploadImage("cms-media", path, image!);
  const supabase = await createClient();
  await supabase.from("cms_sliders").insert({
    title: strOrNull(fd.get("title")),
    subtitle: strOrNull(fd.get("subtitle")),
    link_url: strOrNull(fd.get("link_url")),
    sort_order: numOrNull(fd.get("sort_order")) ?? 0,
    image_path: path,
    placement,
  });
  done("sliders");
}

export async function toggleSlider(fd: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("cms_sliders").update({ is_active: fd.get("active") === "true" }).eq("id", String(fd.get("id")));
  done("sliders");
}

export async function deleteSlider(fd: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("cms_sliders").delete().eq("id", String(fd.get("id")));
  done("sliders");
}

/* ---------- Static pages ---------- */
export async function savePage(fd: FormData) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("cms_pages")
    .update({
      title: String(fd.get("title") ?? "").trim() || "Untitled",
      content_md: String(fd.get("content") ?? ""),
      is_published: fd.get("is_published") === "on",
      updated_by: admin.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", String(fd.get("id")));
  revalidatePath("/", "layout");
  done("pages");
}

/* ---------- Plans / pricing ---------- */
export async function savePlan(fd: FormData) {
  await requireAdmin();
  const id = strOrNull(fd.get("id"));
  const tier = String(fd.get("tier"));
  if (!["free", "verified", "vip"].includes(tier)) return;
  const row = {
    name: String(fd.get("name") ?? "").trim(),
    tier,
    price_pkr: Math.max(0, numOrNull(fd.get("price_pkr")) ?? 0),
    duration_days: Math.max(1, Math.round(numOrNull(fd.get("duration_days")) ?? 30)),
    features: String(fd.get("features") ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
    sort_order: Math.round(numOrNull(fd.get("sort_order")) ?? 0),
    is_active: fd.get("is_active") === "on",
  };
  if (!row.name) return;
  const supabase = await createClient();
  if (id) await supabase.from("plans").update(row).eq("id", id);
  else await supabase.from("plans").insert(row);
  done("plans");
}
