/**
 * Shrinks big phone photos in the browser before upload (keeps the form under the server body limit
 * and makes registration faster on mobile data). Falls back to the original file on any problem.
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<File> {
  if (!file || file.size < 700 * 1024 || !file.type.startsWith("image/")) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Compresses every named file input value inside a FormData in place. */
export async function compressFormImages(fd: FormData, names: string[]) {
  for (const name of names) {
    const f = fd.get(name);
    if (f instanceof File && f.size > 0) fd.set(name, await compressImage(f));
  }
}
