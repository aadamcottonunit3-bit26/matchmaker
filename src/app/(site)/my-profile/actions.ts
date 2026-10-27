"use server";

import { revalidatePath } from "next/cache";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseProfileForm } from "@/lib/profile-form";
import { uploadImage, validateImage } from "@/lib/storage";

export type EditState = { error?: string; ok?: boolean } | undefined;

export async function updateProfile(_prev: EditState, fd: FormData): Promise<EditState> {
  const me = await requireMe();
  const parsed = parseProfileForm(fd);
  if ("error" in parsed) return { error: parsed.error };

  const values = { ...parsed.values };
  // Identity fields are locked once an admin has verified the profile.
  if (me.is_verified) {
    delete values.gender;
    delete values.full_name;
  }

  const photo = fd.get("photo") as File | null;
  if (photo && photo.size > 0) {
    const err = validateImage(photo, "Photo");
    if (err) return { error: err };
    await uploadImage("profile-photos", `${me.id}/photo.jpg`, photo, { normalize: true });
    values.photo_path = `${me.id}/photo.jpg`;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ ...values, blur_photo: fd.get("blur_photo") === "on" })
    .eq("id", me.id);
  if (error) {
    // The real reason is in Vercel -> Logs (for example a column that is missing because a SQL migration was not run).
    console.error("[updateProfile] failed:", error.code, error.message);
    return { error: "Could not save your changes. Please try again." };
  }

  // Date of birth is private and frozen once verified. Written by the server only.
  if (!me.is_verified) {
    const { error: bErr } = await createAdminClient()
      .from("profile_birth")
      .upsert({ profile_id: me.id, dob: parsed.dob, updated_at: new Date().toISOString() });
    if (bErr) {
      console.error("[updateProfile] birth date failed:", bErr.code, bErr.message);
      return { error: "Could not save your changes. Please try again." };
    }
  }

  revalidatePath("/my-profile");
  revalidatePath("/dashboard");
  return { ok: true };
}
