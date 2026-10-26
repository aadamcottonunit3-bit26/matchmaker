import "server-only";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateImage(file: File | null, label: string, required = true): string | null {
  if (!file || file.size === 0) return required ? `${label} is required.` : null;
  if (!IMAGE_TYPES.includes(file.type)) return `${label} must be a JPG, PNG or WebP image.`;
  if (file.size > MAX_BYTES) return `${label} must be smaller than 5 MB.`;
  return null;
}

/** Uploads an image to a private/public bucket. Optionally re-encodes (strips EXIF, caps size). */
export async function uploadImage(
  bucket: string,
  path: string,
  file: File,
  opts: { normalize?: boolean; maxWidth?: number } = {}
) {
  const admin = createAdminClient();
  let body: Buffer = Buffer.from(await file.arrayBuffer());
  let contentType = file.type;
  if (opts.normalize) {
    body = await sharp(body)
      .rotate()
      .resize({ width: opts.maxWidth ?? 1200, withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    contentType = "image/jpeg";
  }
  const { error } = await admin.storage.from(bucket).upload(path, body, { contentType, upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

export async function signedUrl(bucket: string, path: string | null | undefined, seconds = 300) {
  if (!path) return null;
  const admin = createAdminClient();
  const { data } = await admin.storage.from(bucket).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

export function extOf(file: File) {
  return file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
}
