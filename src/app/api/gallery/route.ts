import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { hasShareGrant, readAlbumAccess } from "@/lib/security";
import type { PublicImage } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PUBLIC_IMAGE_COLUMNS =
  "id, title, description, original_name, mime, width, height, s3_key, taken_at, view_count, gps_lat, gps_lng";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const albumId = url.searchParams.get("album");
  const shareId = url.searchParams.get("share");
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 30));
  if (!albumId) {
    return NextResponse.json({ error: "album required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: album } = await admin
    .from("albums")
    .select("id, visibility")
    .eq("id", albumId)
    .maybeSingle();
  if (!album) return NextResponse.json({ error: "not found" }, { status: 404 });

  let allowed = album.visibility === "public";
  let includePrivate = false;
  if (!allowed && album.visibility === "password") {
    const cookieStore = await cookies();
    const granted = readAlbumAccess(cookieStore.get("album_access")?.value);
    allowed = granted.includes(albumId);
  }
  if (!allowed && shareId) {
    const cookieStore = await cookies();
    if (hasShareGrant(cookieStore.get("share_access")?.value, shareId)) {
      const { data: share } = await admin
        .from("shares")
        .select("target_type, target_id, revoked, expires_at")
        .eq("id", shareId)
        .maybeSingle();
      const validShare =
        !!share &&
        !share.revoked &&
        (!share.expires_at || new Date(share.expires_at).getTime() > Date.now()) &&
        share.target_type === "album" &&
        share.target_id === albumId;
      if (validShare) {
        allowed = true;
        includePrivate = true;
      }
    }
  }
  if (!allowed) return NextResponse.json({ error: "not found" }, { status: 404 });

  let query = admin
    .from("album_images")
    .select(`sort_order, images!inner(${PUBLIC_IMAGE_COLUMNS})`)
    .eq("album_id", albumId)
    .order("sort_order", { ascending: true });
  if (!includePrivate) {
    query = query.eq("images.visibility", "public").eq("images.processing_status", "done");
  } else {
    query = query.eq("images.processing_status", "done");
  }
  const { data, error } = await query.range(offset, offset + limit - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = ((data as unknown as Array<{ images: PublicImage }>) ?? [])
    .map((m) => m.images)
    .filter(Boolean);
  return NextResponse.json({
    images: rows,
    hasMore: rows.length === limit,
  });
}
