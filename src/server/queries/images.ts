import "server-only";

import type { AlbumOption, ImageWithRelations, TagWithCount } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ListImagesOptions {
  page: number;
  pageSize: number;
  albumId?: string;
  tagId?: string;
  visibility?: string;
  status?: string;
  q?: string;
  sort?: "created_at" | "taken_at" | "view_count";
  dir?: "asc" | "desc";
}

function normalizeImage(row: Record<string, unknown>): ImageWithRelations {
  const image_tags = (row.image_tags ?? []) as Array<{
    tags?: { id: string; name: string } | null;
  }>;
  const album_images = (row.album_images ?? []) as Array<{ album_id: string }>;
  const { image_tags: _ignoredTags, album_images: _ignoredAlbums, ...rest } = row;
  void _ignoredTags;
  void _ignoredAlbums;
  return {
    ...(rest as unknown as Omit<ImageWithRelations, "tags" | "albumIds">),
    tags: image_tags.map((it) => it.tags).filter((t): t is { id: string; name: string } => !!t),
    albumIds: album_images.map((ai) => ai.album_id),
  };
}

export async function listImages(
  options: ListImagesOptions,
): Promise<{ images: ImageWithRelations[]; total: number }> {
  const admin = createAdminClient();
  const { page, pageSize } = options;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const needsAlbumFilter = !!options.albumId;
  const needsTagFilter = !!options.tagId;
  const selectParts = [
    "*",
    "image_tags(tag_id, tags(id, name))",
    needsAlbumFilter ? "album_images!inner(album_id)" : "album_images(album_id)",
  ];

  let query = admin.from("images").select(selectParts.join(", "), { count: "exact" });

  if (needsAlbumFilter) {
    query = query.eq("album_images.album_id", options.albumId!);
  }
  if (needsTagFilter) {
    query = query.eq("image_tags.tag_id", options.tagId!);
  }
  if (options.visibility) {
    query = query.eq("visibility", options.visibility);
  }
  if (options.status) {
    query = query.eq("processing_status", options.status);
  }
  if (options.q) {
    const q = options.q.replace(/[%,]/g, " ").trim();
    if (q) {
      query = query.or(`title.ilike.%${q}%,original_name.ilike.%${q}%,description.ilike.%${q}%`);
    }
  }

  const sort = options.sort ?? "created_at";
  const dir = options.dir ?? "desc";
  query = query.order(sort, { ascending: dir === "asc" }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const images = ((data as unknown as Record<string, unknown>[]) ?? []).map(normalizeImage);

  return { images, total: count ?? images.length };
}

export async function getImage(id: string): Promise<ImageWithRelations | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("images")
    .select("*, image_tags(tag_id, tags(id, name)), album_images(album_id)")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return normalizeImage(data as unknown as Record<string, unknown>);
}

export async function getAlbumOptions(): Promise<AlbumOption[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("albums")
    .select("id, name, visibility")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as AlbumOption[]) ?? [];
}

export async function getTagsWithCount(): Promise<TagWithCount[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tags")
    .select("id, name, created_at, image_tags(count)")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data as unknown as Record<string, unknown>[]) ?? []).map((row) => {
    const { image_tags, ...rest } = row as { image_tags?: Array<{ count: number }> };
    return {
      ...(rest as unknown as TagWithCount),
      count: image_tags?.[0]?.count ?? 0,
    };
  });
}

export async function getTotalStorageBytes(): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("total_storage_bytes");
  if (error) return 0;
  return Number(data ?? 0);
}

export interface CandidateImage {
  id: string;
  title: string;
  original_name: string;
  s3_key: string;
  processing_status: string;
}

export async function listCandidateImages(limit = 500): Promise<CandidateImage[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("images")
    .select("id, title, original_name, s3_key, processing_status")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as unknown as CandidateImage[]) ?? [];
}
