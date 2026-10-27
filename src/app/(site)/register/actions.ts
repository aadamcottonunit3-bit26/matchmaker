"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseProfileForm } from "@/lib/profile-form";
import { CNIC_REGEX, strOrNull } from "@/lib/validators";
import { extOf, uploadImage, validateImage } from "@/lib/storage";

export type RegisterState = { error?: string } | undefined;

export async function register(_prev: RegisterState, fd: FormData): Promise<RegisterState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const cnic = String(fd.get("cnic_number") ?? "").trim();
  const phone = strOrNull(fd.get("phone"));

  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!CNIC_REGEX.test(cnic)) return { error: "CNIC must look like 12345-1234567-1." };
  if (phone && !/^[+\d][\d\s-]{8,}$/.test(phone)) return { error: "Enter a valid phone number." };
  if (fd.get("agree") !== "on") return { error: "You must accept the Terms & Conditions." };

  const front = fd.get("cnic_front") as File | null;
  const back = fd.get("cnic_back") as File | null;
  const photo = fd.get("photo") as File | null;
  const selfie = fd.get("cnic_selfie") as File | null;
  const fileError =
    validateImage(front, "CNIC front") ??
    validateImage(back, "CNIC back") ??
    validateImage(selfie, "Selfie with CNIC") ??
    validateImage(photo, "Profile photo");
  if (fileError) return { error: fileError };

  const parsed = parseProfileForm(fd);
  if ("error" in parsed) return { error: parsed.error };

  const admin = createAdminClient();

  // Duplicate CNIC check (clear message instead of a DB error)
  const { data: dup } = await admin.from("profile_private").select("profile_id").eq("cnic_number", cnic).maybeSingle();
  if (dup) return { error: "A profile with this CNIC already exists." };

  // Create the auth user (email pre-confirmed; admin verifies identity via CNIC instead)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    const msg = createErr?.message ?? "";
    return { error: /already|registered/i.test(msg) ? "This email is already registered." : "Could not create account. Try again." };
  }
  const uid = created.user.id;

  try {
    const photoPath = `${uid}/photo.jpg`;
    const frontPath = `${uid}/cnic-front.${extOf(front!)}`;
    const backPath = `${uid}/cnic-back.${extOf(back!)}`;
    const selfiePath = `${uid}/selfie.${extOf(selfie!)}`;

    await uploadImage("profile-photos", photoPath, photo!, { normalize: true });
    await uploadImage("cnic-documents", frontPath, front!);
    await uploadImage("cnic-documents", backPath, back!);
    await uploadImage("cnic-documents", selfiePath, selfie!);

    const { error: pErr } = await admin.from("profiles").insert({
      id: uid,
      ...parsed.values,
      photo_path: photoPath,
      blur_photo: fd.get("blur_photo") === "on",
      status: "pending",
    });
    if (pErr) throw new Error(pErr.message);

    // The exact date of birth lives in a private table; profiles only keep the age (set by a trigger).
    const { error: bErr } = await admin.from("profile_birth").insert({ profile_id: uid, dob: parsed.dob });
    if (bErr) throw new Error(bErr.message);

    const { error: prErr } = await admin.from("profile_private").insert({
      profile_id: uid,
      cnic_number: cnic,
      cnic_front_path: frontPath,
      cnic_back_path: backPath,
      selfie_path: selfiePath,
      phone,
    });
    if (prErr) throw new Error(prErr.message);
  } catch (e) {
    // The real reason goes to the server log (Vercel -> Logs); users only see a generic message.
    console.error("[register] failed:", e instanceof Error ? e.message : String(e));
    // Roll back so the user can retry cleanly (cascade removes profile rows)
    await admin.auth.admin.deleteUser(uid);
    await admin.storage.from("profile-photos").remove([`${uid}/photo.jpg`]);
    await admin.storage.from("cnic-documents").remove([
      `${uid}/cnic-front.${extOf(front!)}`,
      `${uid}/cnic-back.${extOf(back!)}`,
      `${uid}/selfie.${extOf(selfie!)}`,
    ]);
    return { error: "Registration failed while saving your details. Please try again." };
  }

  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signInErr) redirect("/login");
  redirect("/dashboard");
}
