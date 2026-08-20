import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { readAlbumAccess } from "@/lib/security";
import type { PublicImage } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PUBLIC_IMAGE_COLUMNS =
  "id, title, description, original_name, mime, width, height, s3_key, taken_at, view_count, gps_lat, gps_lng";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const albumId = url.searchParams.get("album");
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
  if (!allowed && album.visibility === "password") {
    const cookieStore = await cookies();
    const granted = readAlbumAccess(cookieStore.get("album_access")?.value);
    allowed = granted.includes(albumId);
  }
  if (!allowed) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data, error } = await admin
    .from("album_images")
    .select(`sort_order, images!inner(${PUBLIC_IMAGE_COLUMNS})`)
    .eq("album_id", albumId)
    .eq("images.visibility", "public")
    .eq("images.processing_status", "done")
    .order("sort_order", { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = ((data as unknown as Array<{ images: PublicImage }>) ?? [])
    .map((m) => m.images)
    .filter(Boolean);
  return NextResponse.json({
    images: rows,
    hasMore: rows.length === limit,
  });
}
