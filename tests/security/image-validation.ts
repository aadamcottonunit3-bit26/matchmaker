// Run:  npx tsx tests/security/image-validation.ts
import assert from "node:assert/strict";
import sharp from "sharp";
import { IMAGE_PROFILES, sanitizeImage } from "../../src/lib/image";

let pass = 0, fail = 0;
async function t(name: string, fn: () => Promise<void>) {
  try { await fn(); pass++; console.log("PASS |", name); }
  catch (e) { fail++; console.log("FAIL |", name, "->", (e as Error).message); }
}
const P = IMAGE_PROFILES.cnic;
const base = (w = 800, h = 600, ch: 3 | 4 = 3) =>
  sharp({ create: { width: w, height: h, channels: ch, background: ch === 4 ? { r: 200, g: 20, b: 20, alpha: 0.5 } : { r: 30, g: 120, b: 200 } } });

(async () => {
  await t("valid JPEG with GPS EXIF is accepted and the GPS data is removed", async () => {
    const src = await base().withExif({ IFD0: { Copyright: "secret-owner" }, GPS: { GPSLatitudeRef: "N", GPSLatitude: "29/1 22/1 0/1" } } as never).jpeg().toBuffer();
    assert.ok((await sharp(src).metadata()).exif, "test file should contain EXIF");
    const r = await sanitizeImage(src, "CNIC front", P);
    assert.ok(r.ok);
    if (r.ok) { const m = await sharp(r.buffer).metadata(); assert.equal(m.format, "jpeg"); assert.equal(m.exif, undefined); }
  });
  await t("PNG with transparency becomes a JPEG", async () => {
    const r = await sanitizeImage(await base(800, 600, 4).png().toBuffer(), "Photo", IMAGE_PROFILES.photo);
    assert.ok(r.ok); if (r.ok) assert.equal((await sharp(r.buffer).metadata()).format, "jpeg");
  });
  await t("WebP is accepted and re-encoded to JPEG", async () => {
    const r = await sanitizeImage(await base().webp().toBuffer(), "Photo", IMAGE_PROFILES.photo);
    assert.ok(r.ok); if (r.ok) assert.equal((await sharp(r.buffer).metadata()).format, "jpeg");
  });
  await t("EXIF orientation is applied (rotated photo is stored upright)", async () => {
    const src = await base(900, 400).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const r = await sanitizeImage(src, "Photo", IMAGE_PROFILES.photo);
    assert.ok(r.ok); if (r.ok) { const m = await sharp(r.buffer).metadata(); assert.ok((m.height ?? 0) > (m.width ?? 0)); }
  });
  await t("HTML renamed to .jpg is rejected", async () => {
    const r = await sanitizeImage(Buffer.from("<html><script>alert(1)</script></html>"), "CNIC front", P);
    assert.ok(!r.ok);
  });
  await t("SVG with a script is rejected", async () => {
    const r = await sanitizeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), "Photo", IMAGE_PROFILES.photo);
    assert.ok(!r.ok);
  });
  await t("animated GIF is rejected", async () => {
    const r = await sanitizeImage(Buffer.from("47494638396101000100800000ffffff00000021f90401000000002c00000000010001000002024401003b", "hex"), "Photo", IMAGE_PROFILES.photo);
    assert.ok(!r.ok);
  });
  await t("JPEG header followed by garbage is rejected", async () => {
    const r = await sanitizeImage(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("not really an image".repeat(50))]), "CNIC front", P);
    assert.ok(!r.ok);
  });
  await t("PNG signature with a WebP body (type mismatch) is rejected", async () => {
    const webp = await base().webp().toBuffer();
    const r = await sanitizeImage(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), webp]), "Photo", IMAGE_PROFILES.photo);
    assert.ok(!r.ok);
  });
  await t("valid JPEG with a script appended: the payload does not survive re-encoding", async () => {
    const jpg = await base().jpeg().toBuffer();
    const r = await sanitizeImage(Buffer.concat([jpg, Buffer.from("<script>alert('x')</script>")]), "Photo", IMAGE_PROFILES.photo);
    assert.ok(r.ok); if (r.ok) assert.ok(!r.buffer.includes(Buffer.from("<script>")));
  });
  await t("decompression bomb (100 million pixels, tiny file) is rejected", async () => {
    const big = await sharp({ create: { width: 10000, height: 10000, channels: 3, background: "#fff" } }).png({ compressionLevel: 9 }).toBuffer();
    assert.ok(big.length < 5 * 1024 * 1024, "bomb file should be small: " + big.length);
    const r = await sanitizeImage(big, "CNIC front", P);
    assert.ok(!r.ok);
  });
  await t("tiny image (100x100) is rejected for a CNIC", async () => {
    const r = await sanitizeImage(await base(100, 100).jpeg().toBuffer(), "CNIC front", P);
    assert.ok(!r.ok);
  });
  await t("file over 5 MB is rejected", async () => {
    const r = await sanitizeImage(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(5 * 1024 * 1024 + 10)]), "Photo", IMAGE_PROFILES.photo);
    assert.ok(!r.ok);
  });
  await t("empty file is rejected", async () => {
    assert.ok(!(await sanitizeImage(Buffer.alloc(0), "Photo", IMAGE_PROFILES.photo)).ok);
  });
  await t("large photo is scaled down to the limit", async () => {
    const r = await sanitizeImage(await base(4000, 3000).jpeg().toBuffer(), "Photo", IMAGE_PROFILES.photo);
    assert.ok(r.ok); if (r.ok) { const m = await sharp(r.buffer).metadata(); assert.ok(Math.max(m.width!, m.height!) <= 1200); }
  });
  console.log(`--- image validation: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
