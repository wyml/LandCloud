import "server-only";

import type { PublicImage } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ShareListItem {
  id: string;
  target_type: "album" | "image";
  target_id: string;
  target_name: string;
  has_password: boolean;
  expires_at: string | null;
  view_count: number;
  revoked: boolean;
  created_at: string;
  url: string;
}

export async function listShares(): Promise<ShareListItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shares")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data as unknown as Record<string, unknown>[]) ?? [];
  const albumIds = new Set(
    rows.filter((r) => r.target_type === "album").map((r) => r.target_id as string),
  );
  const imageIds = new Set(
    rows.filter((r) => r.target_type === "image").map((r) => r.target_id as string),
  );

  const albumNames = new Map<string, string>();
  if (albumIds.size > 0) {
    const { data: albums } = await admin
      .from("albums")
      .select("id, name")
      .in("id", [...albumIds]);
    for (const a of (albums as unknown as Array<{ id: string; name: string }>) ?? []) {
      albumNames.set(a.id, a.name);
    }
  }
  const imageNames = new Map<string, string>();
  if (imageIds.size > 0) {
    const { data: images } = await admin
      .from("images")
      .select("id, title, original_name")
      .in("id", [...imageIds]);
    for (const i of (images as unknown as Array<{
      id: string;
      title: string;
      original_name: string;
    }>) ?? []) {
      imageNames.set(i.id, i.title || i.original_name);
    }
  }

  return rows.map((row) => {
    const targetId = row.target_id as string;
    const name = row.target_type === "album" ? albumNames.get(targetId) : imageNames.get(targetId);
    return {
      id: row.id as string,
      target_type: row.target_type as "album" | "image",
      target_id: targetId,
      target_name: name ?? "（已删除）",
      has_password: Boolean(row.password_hash),
      expires_at: (row.expires_at as string | null) ?? null,
      view_count: row.view_count as number,
      revoked: Boolean(row.revoked),
      created_at: row.created_at as string,
      url: `/s/${row.id}`,
    };
  });
}

export interface ShareForView {
  id: string;
  target_type: "album" | "image";
  target_id: string;
  has_password: boolean;
  revoked: boolean;
  expires_at: string | null;
  view_count: number;
}

export async function getShareForView(id: string): Promise<ShareForView | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("shares")
    .select("id, target_type, target_id, password_hash, revoked, expires_at, view_count")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as Record<string, unknown>;
  if (row.revoked) return null;
  if (row.expires_at && new Date(row.expires_at as string).getTime() < Date.now()) {
    return null;
  }
  return {
    id: row.id as string,
    target_type: row.target_type as "album" | "image",
    target_id: row.target_id as string,
    has_password: Boolean(row.password_hash),
    revoked: false,
    expires_at: (row.expires_at as string | null) ?? null,
    view_count: row.view_count as number,
  };
}

export async function getSharedAlbumContent(albumId: string): Promise<{
  albumName: string;
  images: PublicImage[];
} | null> {
  const admin = createAdminClient();
  const { data: album } = await admin
    .from("albums")
    .select("id, name")
    .eq("id", albumId)
    .maybeSingle();
  if (!album) return null;

  const { data: members, error } = await admin
    .from("album_images")
    .select(
      "sort_order, images!inner(id, title, description, original_name, mime, width, height, s3_key, taken_at, view_count, gps_lat, gps_lng)",
    )
    .eq("album_id", albumId)
    .eq("images.processing_status", "done")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);

  const images = ((members as unknown as Array<{ images: PublicImage }>) ?? [])
    .map((m) => m.images)
    .filter(Boolean);

  return { albumName: (album as unknown as { name: string }).name, images };
}
