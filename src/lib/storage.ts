import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_UPLOAD_BYTES, sanitizeImage, type ImageProfile } from "@/lib/image";

/**
 * Reads an uploaded file, verifies that it is really an image and re-encodes it (see lib/image.ts).
 * Returns the clean JPEG bytes, or a user-facing error.
 */
export async function prepareImage(
  file: File | null,
  label: string,
  profile: ImageProfile
): Promise<{ ok: true; buffer: Buffer } | { ok: false; error: string }> {
  if (!file || file.size === 0) return { ok: false, error: `${label} is required.` };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: `${label} must be smaller than 5 MB.` };
  return sanitizeImage(Buffer.from(await file.arrayBuffer()), label, profile);
}

/** Stores already-sanitized bytes (always JPEG). Only the server (service role) writes to Storage. */
export async function uploadBuffer(bucket: string, path: string, body: Buffer) {
  const { error } = await createAdminClient()
    .storage.from(bucket)
    .upload(path, body, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

/** Short-lived link, created only after the caller has been authorized on the server. */
export async function signedUrl(bucket: string, path: string | null | undefined, seconds = 300) {
  if (!path) return null;
  const { data } = await createAdminClient().storage.from(bucket).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}
