import "server-only";

import type { AlbumRow, ImageRow } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AlbumListItem {
  id: string;
  name: string;
  description: string;
  visibility: AlbumRow["visibility"];
  sort_order: number;
  view_count: number;
  imageCount: number;
  cover: { id: string; s3_key: string; title: string } | null;
  created_at: string;
  updated_at: string;
}

export interface AlbumImageEntry {
  image_id: string;
  sort_order: number;
  image: ImageRow;
}

export interface AlbumDetail extends AlbumListItem {
  images: AlbumImageEntry[];
}

export async function listAlbums(): Promise<AlbumListItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("albums")
    .select("*, cover_image:cover_image_id(id, s3_key, title), album_images(count)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const albums = ((data as unknown as Record<string, unknown>[]) ?? []).map((row) => {
    const coverImage = (row.cover_image ?? null) as {
      id: string;
      s3_key: string;
      title: string;
    } | null;
    const albumImages = (row.album_images ?? []) as Array<{ count: number }>;
    const { cover_image, album_images, ...rest } = row;
    void cover_image;
    void album_images;
    return {
      ...(rest as unknown as Omit<AlbumListItem, "imageCount" | "cover">),
      imageCount: albumImages[0]?.count ?? 0,
      cover: coverImage,
    };
  });

  const noCoverIds = albums.filter((a) => !a.cover).map((a) => a.id);
  if (noCoverIds.length > 0) {
    const { data: latest } = await admin
      .from("album_images")
      .select(`album_id, images!inner(id, s3_key, title)`)
      .in("album_id", noCoverIds)
      .eq("images.processing_status", "done")
      .order("images.created_at", { ascending: false, referencedTable: "images" });
    const fallback = new Map<string, { id: string; s3_key: string; title: string }>();
    for (const row of (latest as unknown as Array<{
      album_id: string;
      images: { id: string; s3_key: string; title: string };
    }>) ?? []) {
      if (!fallback.has(row.album_id)) fallback.set(row.album_id, row.images);
    }
    for (const album of albums) {
      if (!album.cover && fallback.has(album.id)) album.cover = fallback.get(album.id)!;
    }
  }

  return albums;
}

export async function getAlbumDetail(id: string): Promise<AlbumDetail | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("albums")
    .select(
      "*, cover_image:cover_image_id(id, s3_key, title), album_images(image_id, sort_order, images(id, title, original_name, s3_key, mime, processing_status, taken_at, created_at))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as Record<string, unknown>;
  const coverImage = (row.cover_image ?? null) as {
    id: string;
    s3_key: string;
    title: string;
  } | null;
  const albumImages = (row.album_images ?? []) as Array<{
    image_id: string;
    sort_order: number;
    images: ImageRow;
  }>;

  return {
    ...(row as unknown as Omit<AlbumListItem, "imageCount" | "cover">),
    imageCount: albumImages.length,
    cover:
      coverImage ??
      (albumImages[0]
        ? { id: albumImages[0].images.id, s3_key: albumImages[0].images.s3_key, title: albumImages[0].images.title }
        : null),
    images: albumImages
      .map((ai) => ({ image_id: ai.image_id, sort_order: ai.sort_order, image: ai.images }))
      .sort((a, b) => a.sort_order - b.sort_order),
  };
}
