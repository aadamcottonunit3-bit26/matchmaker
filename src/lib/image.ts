import sharp from "sharp";

/**
 * Upload safety: never trust the browser-declared type or the file name.
 *  1. size limit
 *  2. magic bytes must be JPEG, PNG or WebP
 *  3. the decoder must agree with the magic bytes, the image must not be animated, and its size must be sane
 *  4. the image is RE-ENCODED to a fresh JPEG: this drops EXIF/GPS and any hidden payload, and the stored
 *     file is always `image/jpeg` whatever was uploaded.
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_INPUT_SIDE = 10000;
const MAX_INPUT_PIXELS = 50_000_000;

export const IMAGE_PROFILES = {
  /** CNIC front/back/selfie: keep it readable for the admin */
  cnic: { maxSide: 2400, quality: 88, minSide: 300 },
  photo: { maxSide: 1200, quality: 82, minSide: 200 },
  receipt: { maxSide: 2000, quality: 85, minSide: 200 },
  cms: { maxSide: 2000, quality: 85, minSide: 200 },
} as const;
export type ImageProfile = (typeof IMAGE_PROFILES)[keyof typeof IMAGE_PROFILES];

export type ImageResult = { ok: true; buffer: Buffer } | { ok: false; error: string };

export function sniffImage(buf: Buffer): "jpeg" | "png" | "webp" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  return null;
}

export async function sanitizeImage(input: Buffer, label: string, profile: ImageProfile): Promise<ImageResult> {
  if (input.length === 0) return { ok: false, error: `${label} is required.` };
  if (input.length > MAX_UPLOAD_BYTES) return { ok: false, error: `${label} must be smaller than 5 MB.` };

  const kind = sniffImage(input);
  if (!kind) return { ok: false, error: `${label} must be a JPG, PNG or WebP image.` };

  try {
    const img = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" });
    const meta = await img.metadata();
    if (meta.format !== kind) return { ok: false, error: `${label} must be a JPG, PNG or WebP image.` };
    if ((meta.pages ?? 1) > 1) return { ok: false, error: `${label} must be a single, non-animated image.` };
    if (!meta.width || !meta.height) return { ok: false, error: `${label} could not be read as an image.` };
    if (Math.min(meta.width, meta.height) < profile.minSide) {
      return { ok: false, error: `${label} is too small. Please upload a clearer, larger image.` };
    }
    if (Math.max(meta.width, meta.height) > MAX_INPUT_SIDE) {
      return { ok: false, error: `${label} is too large in size (pixels). Please upload a smaller image.` };
    }

    const buffer = await img
      .rotate() // apply the EXIF orientation, then the metadata is dropped below
      .resize({ width: profile.maxSide, height: profile.maxSide, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: profile.quality, mozjpeg: true })
      .toBuffer(); // sharp strips all metadata (EXIF, GPS, ICC comments) unless asked to keep it
    return { ok: true, buffer };
  } catch {
    return { ok: false, error: `${label} could not be read as an image.` };
  }
}
