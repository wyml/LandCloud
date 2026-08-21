import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { isAdminUser } from "@/lib/auth";
import { verifyShareToken } from "@/lib/security";
import { canAccessImage, proxyCacheControl } from "@/lib/images/access";
import { isImagePubliclyVisible } from "@/server/queries/public";
import { getObjectBuffer } from "@/lib/s3";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function hasShareAccess(
  admin: ReturnType<typeof createAdminClient>,
  imageId: string,
): Promise<boolean> {
  const cookieStore = await cookies();
  const value = cookieStore.get("share_access")?.value ?? "";
  const shareIds = value
    .split(",")
    .filter(Boolean)
    .map((token) => verifyShareToken(token))
    .filter((id): id is string => id !== null);
  if (shareIds.length === 0) return false;

  const { data: shares } = await admin
    .from("shares")
    .select("id, target_type, target_id, revoked, expires_at")
    .in("id", shareIds);
  const active = ((shares as unknown as Record<string, unknown>[]) ?? []).filter(
    (s) => !s.revoked && (!s.expires_at || new Date(s.expires_at as string).getTime() > Date.now()),
  );
  for (const share of active) {
    if (share.target_type === "image" && share.target_id === imageId) return true;
  }
  const albumShareIds = active
    .filter((s) => s.target_type === "album")
    .map((s) => s.target_id as string);
  if (albumShareIds.length === 0) return false;
  const { data: members } = await admin
    .from("album_images")
    .select("album_id")
    .eq("image_id", imageId)
    .in("album_id", albumShareIds);
  return (members?.length ?? 0) > 0;
}

export async function GET(
  _request: Request,
  { params }: RouteContext<"/f/video/[imageId]">,
) {
  const { imageId } = await params;

  const admin = createAdminClient();
  const { data: image } = await admin
    .from("images")
    .select("id, visibility, processing_status, is_live_photo, live_photo_video_key")
    .eq("id", imageId)
    .eq("is_live_photo", true)
    .maybeSingle();
  if (!image || !image.live_photo_video_key) {
    return new NextResponse("Not found", { status: 404 });
  }

  const publiclyVisible = await isImagePubliclyVisible(image);
  const isHidden = image.visibility === "hidden";

  let isAdmin = false;
  if (!publiclyVisible && !isHidden) {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getUser();
    isAdmin = isAdminUser(session.user);
  }
  const shareGranted = !publiclyVisible && !isHidden && !isAdmin ? await hasShareAccess(admin, imageId) : false;

  if (!canAccessImage({ publiclyVisible, isAdmin, shareGranted, isHidden })) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const buffer = await getObjectBuffer(image.live_photo_video_key);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "video/quicktime",
        "Cache-Control": proxyCacheControl(publiclyVisible),
        "X-Content-Type-Options": "nosniff",
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
