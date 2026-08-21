import "server-only";

import type { PublicAlbum, PublicImage } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";

interface ImageSelectShape {
  id: string;
  title: string;
  description: string;
  original_name: string;
  mime: string;
  width: number | null;
  height: number | null;
  s3_key: string;
  taken_at: string | null;
  view_count: number;
  gps_lat: number | null;
  gps_lng: number | null;
  is_live_photo: boolean;
  live_photo_video_key: string | null;
}

const PUBLIC_IMAGE_COLUMNS =
  "id, title, description, original_name, mime, width, height, s3_key, taken_at, view_count, gps_lat, gps_lng, is_live_photo, live_photo_video_key";

function toPublicImage(row: ImageSelectShape): PublicImage {
  return row;
}

export async function isImagePubliclyVisible(image: {
  id: string;
  visibility: string;
  processing_status: string;
}): Promise<boolean> {
  if (image.visibility === "public" && image.processing_status === "done") {
    return true;
  }
  if (image.visibility !== "private" && image.visibility !== "password") {
    return false;
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("album_images")
    .select("album_id, albums!inner(visibility)")
    .eq("image_id", image.id)
    .eq("albums.visibility", "public");
  return (data?.length ?? 0) > 0;
}

export async function listPublicAlbums(): Promise<PublicAlbum[]> {
  const admin = createAdminClient();
  const { data: albums, error } = await admin
    .from("albums")
    .select(
      "id, name, description, visibility, cover_image_id, view_count, updated_at, cover_image:cover_image_id(id, s3_key, title)",
    )
    .eq("visibility", "public")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = (albums as unknown as Record<string, unknown>[]) ?? [];
  const counts = await countPublicImagesPerAlbum(rows.map((r) => r.id as string));

  return rows.map((row) => {
    const { cover_image, ...rest } = row;
    void cover_image;
    return {
      ...(rest as unknown as Omit<PublicAlbum, "imageCount" | "cover">),
      imageCount: counts.get(row.id as string) ?? 0,
      cover: (row.cover_image as { id: string; s3_key: string; title: string } | null) ?? null,
    };
  });
}

async function countPublicImagesPerAlbum(albumIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (albumIds.length === 0) return map;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("album_images")
    .select("album_id, images!inner(id)")
    .in("album_id", albumIds)
    .eq("images.visibility", "public")
    .eq("images.processing_status", "done");
  if (error) throw new Error(error.message);
  for (const row of (data as unknown as Array<{ album_id: string }>) ?? []) {
    map.set(row.album_id, (map.get(row.album_id) ?? 0) + 1);
  }
  return map;
}

export async function getPublicAlbumDetail(id: string): Promise<{
  album: PublicAlbum;
  images: PublicImage[];
} | null> {
  const admin = createAdminClient();
  const { data: albumRow, error } = await admin
    .from("albums")
    .select(
      "id, name, description, visibility, cover_image_id, view_count, updated_at, cover_image:cover_image_id(id, s3_key, title)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !albumRow) return null;
  const row = albumRow as unknown as Record<string, unknown>;
  if (row.visibility === "private") return null;

  const { data: members, error: membersError } = await admin
    .from("album_images")
    .select(`sort_order, images!inner(${PUBLIC_IMAGE_COLUMNS})`)
    .eq("album_id", id)
    .eq("images.visibility", "public")
    .eq("images.processing_status", "done")
    .order("sort_order", { ascending: true });
  if (membersError) throw new Error(membersError.message);

  const images = ((members as unknown as Array<{ images: ImageSelectShape }>) ?? [])
    .map((m) => toPublicImage(m.images))
    .filter(Boolean);

  return {
    album: {
      ...(row as unknown as Omit<PublicAlbum, "imageCount" | "cover">),
      imageCount: images.length,
      cover: (row.cover_image as { id: string; s3_key: string; title: string } | null) ?? null,
    },
    images,
  };
}

export async function listPublicTags(): Promise<
  Array<{ id: string; name: string; count: number }>
> {
  const admin = createAdminClient();
  const { data: tags } = await admin.from("tags").select("id, name");
  const rows = (tags as unknown as Array<{ id: string; name: string }>) ?? [];
  const { data: links } = await admin
    .from("image_tags")
    .select("tag_id, images!inner(id)")
    .eq("images.visibility", "public")
    .eq("images.processing_status", "done");
  const counts = new Map<string, number>();
  for (const link of (links as unknown as Array<{ tag_id: string }>) ?? []) {
    counts.set(link.tag_id, (counts.get(link.tag_id) ?? 0) + 1);
  }
  return rows
    .map((t) => ({ ...t, count: counts.get(t.id) ?? 0 }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);
}

export async function listImagesByTag(name: string, limit = 200): Promise<PublicImage[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("image_tags")
    .select(`images!inner(${PUBLIC_IMAGE_COLUMNS}), tags!inner(name)`)
    .eq("tags.name", name)
    .eq("images.visibility", "public")
    .eq("images.processing_status", "done")
    .order("images.taken_at", {
      referencedTable: "images",
      ascending: false,
      nullsFirst: false,
    })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data as unknown as Array<{ images: ImageSelectShape }>) ?? [])
    .map((m) => toPublicImage(m.images))
    .filter(Boolean);
}

export async function listRecentPublicImages(limit = 30): Promise<PublicImage[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("images")
    .select(PUBLIC_IMAGE_COLUMNS)
    .eq("visibility", "public")
    .eq("processing_status", "done")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data as unknown as ImageSelectShape[]) ?? []).map(toPublicImage);
}

export interface PublicImageDetail extends PublicImage {
  exif: Record<string, unknown>;
  tags: Array<{ id: string; name: string }>;
  albums: Array<{ id: string; name: string }>;
}

export async function getPublicImage(id: string): Promise<PublicImageDetail | null> {
  const admin = createAdminClient();
  const { data: img, error } = await admin
    .from("images")
    .select("*, image_tags(tags(id, name))")
    .eq("id", id)
    .maybeSingle();
  if (error || !img) return null;
  const row = img as unknown as Record<string, unknown>;
  if (
    !(await isImagePubliclyVisible(
      row as unknown as { id: string; visibility: string; processing_status: string },
    ))
  )
    return null;

  const { data: members } = await admin
    .from("album_images")
    .select("album_id, albums!inner(id, name, visibility)")
    .eq("image_id", id)
    .eq("albums.visibility", "public");
  const albums = (
    (members as unknown as Array<{ albums: { id: string; name: string } }>) ?? []
  ).map((m) => m.albums);

  const tags = ((row.image_tags as unknown as Array<{ tags: { id: string; name: string } }>) ?? [])
    .map((t) => t.tags)
    .filter(Boolean);

  const { id: _id, image_tags: _tags, ...rest } = row;
  void _id;
  void _tags;
  return {
    id: row.id as string,
    ...(rest as unknown as Omit<PublicImage, "id">),
    exif: (row.exif as Record<string, unknown>) ?? {},
    tags,
    albums,
  };
}

export async function getNeighborImageIds(
  currentId: string,
  takenAt: string | null,
): Promise<{ prevId: string | null; nextId: string | null }> {
  const admin = createAdminClient();
  const boundary = takenAt ?? new Date(0).toISOString();
  const { data: prevData } = await admin
    .from("images")
    .select("id")
    .eq("visibility", "public")
    .eq("processing_status", "done")
    .lt("taken_at", boundary)
    .order("taken_at", { ascending: false, nullsFirst: false })
    .limit(1);
  const { data: nextData } = await admin
    .from("images")
    .select("id")
    .eq("visibility", "public")
    .eq("processing_status", "done")
    .gt("taken_at", boundary)
    .order("taken_at", { ascending: true, nullsFirst: false })
    .limit(1);
  const prevId = prevData?.[0]?.id as string | undefined;
  const nextId = nextData?.[0]?.id as string | undefined;
  return {
    prevId: prevId && prevId !== currentId ? prevId : null,
    nextId: nextId && nextId !== currentId ? nextId : null,
  };
}

export interface PublicSearchResult {
  images: PublicImage[];
  albums: PublicAlbum[];
}

export async function searchPublic(query: string): Promise<PublicSearchResult> {
  const q = query.trim();
  if (!q) return { images: [], albums: [] };
  const admin = createAdminClient();
  const like = `%${q}%`;

  const images: PublicImage[] = [];

  const { data: byText } = await admin
    .from("images")
    .select(PUBLIC_IMAGE_COLUMNS)
    .eq("visibility", "public")
    .eq("processing_status", "done")
    .or(`title.ilike.${like},description.ilike.${like},original_name.ilike.${like}`)
    .order("created_at", { ascending: false })
    .limit(20);
  for (const row of (byText as unknown as ImageSelectShape[]) ?? []) {
    images.push(toPublicImage(row));
  }

  const { data: byTag } = await admin
    .from("image_tags")
    .select(`images!inner(${PUBLIC_IMAGE_COLUMNS}), tags!inner(name)`)
    .eq("images.visibility", "public")
    .eq("images.processing_status", "done")
    .ilike("tags.name", like)
    .limit(20);
  for (const row of (byTag as unknown as Array<{ images: ImageSelectShape }>) ?? []) {
    images.push(toPublicImage(row.images));
  }

  if (/^\d{4}$/.test(q)) {
    const start = `${q}-01-01`;
    const end = `${Number(q) + 1}-01-01`;
    const { data: byYear } = await admin
      .from("images")
      .select(PUBLIC_IMAGE_COLUMNS)
      .eq("visibility", "public")
      .eq("processing_status", "done")
      .gte("taken_at", start)
      .lt("taken_at", end)
      .order("taken_at", { ascending: false })
      .limit(20);
    for (const row of (byYear as unknown as ImageSelectShape[]) ?? []) {
      images.push(toPublicImage(row));
    }
  }

  const seen = new Set<string>();
  const uniqueImages = images.filter((img) => {
    if (seen.has(img.id)) return false;
    seen.add(img.id);
    return true;
  });

  const { data: albumRows, error: albumError } = await admin
    .from("albums")
    .select(
      "id, name, description, visibility, cover_image_id, view_count, updated_at, cover_image:cover_image_id(id, s3_key, title)",
    )
    .eq("visibility", "public")
    .or(`name.ilike.${like},description.ilike.${like}`)
    .order("sort_order", { ascending: true })
    .limit(10);
  if (albumError) throw new Error(albumError.message);

  const rawAlbums = (albumRows as unknown as Record<string, unknown>[]) ?? [];
  const counts = await countPublicImagesPerAlbum(rawAlbums.map((r) => r.id as string));
  const albums = rawAlbums.map((row) => ({
    ...(row as unknown as Omit<PublicAlbum, "imageCount" | "cover">),
    imageCount: counts.get(row.id as string) ?? 0,
    cover: (row.cover_image as { id: string; s3_key: string; title: string } | null) ?? null,
  }));

  return { images: uniqueImages, albums };
}

export async function countPublicImages(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("images")
    .select("id", { count: "exact", head: true })
    .eq("visibility", "public")
    .eq("processing_status", "done");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export interface MapPhoto {
  id: string;
  title: string;
  lat: number;
  lng: number;
  taken_at: string | null;
}

export async function getMapPhotos(limit = 5000): Promise<{
  photos: MapPhoto[];
  locatedCount: number;
  footprintCount: number;
}> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("images")
    .select("id, title, original_name, gps_lat, gps_lng, taken_at")
    .eq("visibility", "public")
    .eq("processing_status", "done")
    .not("gps_lat", "is", null)
    .not("gps_lng", "is", null)
    .order("taken_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  const rows =
    (data as unknown as Array<{
      id: string;
      title: string;
      original_name: string;
      gps_lat: number;
      gps_lng: number;
      taken_at: string | null;
    }>) ?? [];

  const photos: MapPhoto[] = rows.map((r) => ({
    id: r.id,
    title: r.title || r.original_name,
    lat: r.gps_lat,
    lng: r.gps_lng,
    taken_at: r.taken_at,
  }));

  const footprints = new Set(
    photos.map((p) => `${Math.round(p.lat * 100)},${Math.round(p.lng * 100)}`),
  );

  return { photos, locatedCount: photos.length, footprintCount: footprints.size };
}
