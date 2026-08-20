"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AlbumInput {
  name: string;
  description: string;
  visibility: "public" | "private" | "password";
  sortOrder: number;
}

export async function createAlbum(input: AlbumInput) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("albums").insert({
    name: input.name.trim(),
    description: input.description.trim(),
    visibility: input.visibility,
    sort_order: input.sortOrder,
  });
  if (error) throw new Error(error.message);
  refresh();
}

export async function updateAlbum(id: string, input: AlbumInput) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("albums")
    .update({
      name: input.name.trim(),
      description: input.description.trim(),
      visibility: input.visibility,
      sort_order: input.sortOrder,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteAlbum(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  // 关联的 album_images 由外键级联删除，图片本身保留
  const { error } = await admin.from("albums").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function setAlbumCover(albumId: string, imageId: string | null) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("albums")
    .update({ cover_image_id: imageId })
    .eq("id", albumId);
  if (error) throw new Error(error.message);
  refresh();
}

export async function addImagesToAlbum(input: { albumId: string; imageIds: string[] }) {
  await requireAdmin();
  if (input.imageIds.length === 0) return;
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("album_images")
    .select("image_id, sort_order")
    .eq("album_id", input.albumId);
  const existingIds = new Set((existing ?? []).map((e) => e.image_id as string));
  const maxOrder = Math.max(0, ...((existing ?? []).map((e) => e.sort_order as number) ?? [0]));

  const rows = input.imageIds
    .filter((id) => !existingIds.has(id))
    .map((imageId, i) => ({
      album_id: input.albumId,
      image_id: imageId,
      sort_order: maxOrder + i + 1,
    }));
  if (rows.length === 0) return;

  const { error } = await admin.from("album_images").insert(rows);
  if (error) throw new Error(error.message);
  refresh();
}

export async function removeImagesFromAlbum(input: { albumId: string; imageIds: string[] }) {
  await requireAdmin();
  if (input.imageIds.length === 0) return;
  const admin = createAdminClient();
  const { error } = await admin
    .from("album_images")
    .delete()
    .eq("album_id", input.albumId)
    .in("image_id", input.imageIds);
  if (error) throw new Error(error.message);
  refresh();
}

export async function reorderAlbumImages(input: { albumId: string; orderedImageIds: string[] }) {
  await requireAdmin();
  if (input.orderedImageIds.length === 0) return;
  const admin = createAdminClient();
  for (let i = 0; i < input.orderedImageIds.length; i++) {
    const { error } = await admin
      .from("album_images")
      .update({ sort_order: i })
      .eq("album_id", input.albumId)
      .eq("image_id", input.orderedImageIds[i]);
    if (error) throw new Error(error.message);
  }
  refresh();
}
