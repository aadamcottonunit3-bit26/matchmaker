"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseProfileForm } from "@/lib/profile-form";
import { CNIC_REGEX, strOrNull } from "@/lib/validators";
import { prepareImage, uploadBuffer } from "@/lib/storage";
import { IMAGE_PROFILES } from "@/lib/image";
import { TOO_MANY, allow, allowIp } from "@/lib/rate-limit";

export type RegisterState = { error?: string } | undefined;

// One neutral message for "email already used" and "CNIC already used": it does not tell a stranger
// which of the two exists, or whether a given email / CNIC is registered.
const DUPLICATE =
  "We could not complete your registration with these details. If you already have an account, please log in or use “Forgot password?”.";

export async function register(_prev: RegisterState, fd: FormData): Promise<RegisterState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const cnic = String(fd.get("cnic_number") ?? "").trim();
  const phone = strOrNull(fd.get("phone"));

  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password.length > 72) return { error: "Password must be at most 72 characters." };
  if (!CNIC_REGEX.test(cnic)) return { error: "CNIC must look like 12345-1234567-1." };
  if (phone && !/^[+\d][\d\s-]{8,}$/.test(phone)) return { error: "Enter a valid phone number." };
  if (fd.get("agree") !== "on") return { error: "You must accept the Terms & Conditions." };

  // Abuse protection (registration uploads four images, so it is the most expensive endpoint)
  if (!(await allowIp("register", 5, 3600)) || !(await allow("register-email", email, 3, 86400))) {
    return { error: TOO_MANY };
  }

  // Verify that the uploads are REAL images and re-encode them (drops metadata such as GPS location)
  const [front, back, selfie, photo] = await Promise.all([
    prepareImage(fd.get("cnic_front") as File | null, "CNIC front", IMAGE_PROFILES.cnic),
    prepareImage(fd.get("cnic_back") as File | null, "CNIC back", IMAGE_PROFILES.cnic),
    prepareImage(fd.get("cnic_selfie") as File | null, "Selfie with CNIC", IMAGE_PROFILES.cnic),
    prepareImage(fd.get("photo") as File | null, "Profile photo", IMAGE_PROFILES.photo),
  ]);
  for (const img of [front, back, selfie, photo]) if (!img.ok) return { error: img.error };
  if (!front.ok || !back.ok || !selfie.ok || !photo.ok) return { error: "Please check your images." };

  const parsed = parseProfileForm(fd);
  if ("error" in parsed) return { error: parsed.error };

  const admin = createAdminClient();

  // Duplicate CNIC check (neutral message)
  const { data: dup } = await admin.from("profile_private").select("profile_id").eq("cnic_number", cnic).maybeSingle();
  if (dup) return { error: DUPLICATE };

  // Create the auth user (email pre-confirmed; the admin verifies identity via CNIC instead)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    const msg = createErr?.message ?? "";
    return { error: /already|registered|exists/i.test(msg) ? DUPLICATE : "Could not create account. Try again." };
  }
  const uid = created.user.id;

  // File names are generated here, never taken from the upload; every stored image is a fresh JPEG.
  const photoPath = `${uid}/photo.jpg`;
  const frontPath = `${uid}/cnic-front.jpg`;
  const backPath = `${uid}/cnic-back.jpg`;
  const selfiePath = `${uid}/selfie.jpg`;

  try {
    await uploadBuffer("profile-photos", photoPath, photo.buffer);
    await uploadBuffer("cnic-documents", frontPath, front.buffer);
    await uploadBuffer("cnic-documents", backPath, back.buffer);
    await uploadBuffer("cnic-documents", selfiePath, selfie.buffer);

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
    const reason = e instanceof Error ? e.message : String(e);
    console.error("[register] failed:", reason);
    // Roll back so the user can retry cleanly (cascade removes profile rows)
    await admin.auth.admin.deleteUser(uid);
    await admin.storage.from("profile-photos").remove([photoPath]);
    await admin.storage.from("cnic-documents").remove([frontPath, backPath, selfiePath]);
    if (/duplicate key|unique/i.test(reason)) return { error: DUPLICATE };
    return { error: "Registration failed while saving your details. Please try again." };
  }

  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signInErr) redirect("/login");
  redirect("/dashboard");
}
