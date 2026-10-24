import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Serves a member's photo with privacy rules enforced on the server:
 *  - owner and admins always see the original
 *  - active members see the original if the owner has NOT enabled blur
 *  - if blur is enabled, they see the original only after the owner approved a photo request
 *  - otherwise a heavily blurred version is returned (the original never leaves the server)
 */
export async function GET(_req: Request, ctx: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const admin = createAdminClient();
  const [{ data: viewer }, { data: owner }] = await Promise.all([
    admin.from("profiles").select("id, role, status, valid_until").eq("id", user.id).maybeSingle(),
    admin.from("profiles").select("id, status, photo_path, blur_photo").eq("id", profileId).maybeSingle(),
  ]);
  if (!viewer || !owner?.photo_path) return new NextResponse("Not found", { status: 404 });

  const isOwner = viewer.id === owner.id;
  const isAdmin = viewer.role === "admin";
  const viewerActive =
    viewer.status === "verified" && (!viewer.valid_until || new Date(viewer.valid_until) > new Date());

  if (!isOwner && !isAdmin && !(viewerActive && owner.status === "verified")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let showOriginal = isOwner || isAdmin || !owner.blur_photo;
  if (!showOriginal) {
    const { data: reqRow } = await admin
      .from("photo_requests")
      .select("status")
      .eq("requester_id", viewer.id)
      .eq("owner_id", owner.id)
      .maybeSingle();
    showOriginal = reqRow?.status === "approved";
  }

  const { data: file, error } = await admin.storage.from("profile-photos").download(owner.photo_path);
  if (error || !file) return new NextResponse("Not found", { status: 404 });

  let body: Buffer = Buffer.from(await file.arrayBuffer());
  if (!showOriginal) {
    body = await sharp(body).resize({ width: 320 }).blur(18).jpeg({ quality: 60 }).toBuffer();
  }

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": "image/jpeg",
      // private: never cached by shared caches; short browser cache so approvals take effect quickly
      "Cache-Control": "private, max-age=30",
    },
  });
}
