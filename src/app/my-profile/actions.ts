"use server";

import { revalidatePath } from "next/cache";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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
    delete values.dob;
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
  if (error) return { error: "Could not save your changes. Please try again." };

  revalidatePath("/my-profile");
  revalidatePath("/dashboard");
  return { ok: true };
}
