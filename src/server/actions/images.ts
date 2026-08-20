"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { variantsPrefix } from "@/lib/images/variants";
import { deleteObject } from "@/lib/s3";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateImageDetails(input: {
  id: string;
  title: string;
  description: string;
  visibility: "public" | "private" | "password";
  takenAt: string | null;
}) {
  await requireAdmin();
  const admin = createAdminClient();
  const takenAt =
    input.takenAt && !Number.isNaN(new Date(input.takenAt).getTime())
      ? new Date(input.takenAt).toISOString()
      : null;
  const { error } = await admin
    .from("images")
    .update({
      title: input.title,
      description: input.description,
      visibility: input.visibility,
      taken_at: takenAt,
    })
    .eq("id", input.id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function setImageAlbums(input: { imageId: string; albumIds: string[] }) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error: deleteError } = await admin
    .from("album_images")
    .delete()
    .eq("image_id", input.imageId);
  if (deleteError) throw new Error(deleteError.message);

  if (input.albumIds.length > 0) {
    const { error: insertError } = await admin.from("album_images").insert(
      input.albumIds.map((albumId) => ({
        album_id: albumId,
        image_id: input.imageId,
      })),
    );
    if (insertError) throw new Error(insertError.message);
  }
  refresh();
}

export async function setImageTags(input: { imageId: string; tagNames: string[] }) {
  await requireAdmin();
  const admin = createAdminClient();
  const names = [...new Set(input.tagNames.map((n) => n.trim()).filter(Boolean))];

  const { error: deleteError } = await admin
    .from("image_tags")
    .delete()
    .eq("image_id", input.imageId);
  if (deleteError) throw new Error(deleteError.message);

  for (const name of names) {
    const { data: tag, error: tagError } = await admin
      .from("tags")
      .upsert({ name }, { onConflict: "name" })
      .select("id")
      .single();
    if (tagError) throw new Error(tagError.message);
    const { error: linkError } = await admin
      .from("image_tags")
      .upsert({ image_id: input.imageId, tag_id: tag.id });
    if (linkError) throw new Error(linkError.message);
  }
  refresh();
}

export async function deleteImages(imageIds: string[]) {
  await requireAdmin();
  if (imageIds.length === 0) return;
  const admin = createAdminClient();

  const { data: rows, error: fetchError } = await admin
    .from("images")
    .select("id, s3_key")
    .in("id", imageIds);
  if (fetchError) throw new Error(fetchError.message);

  const { error: deleteError } = await admin.from("images").delete().in("id", imageIds);
  if (deleteError) throw new Error(deleteError.message);

  await Promise.allSettled(
    (rows ?? []).map(async (row) => {
      try {
        await deleteObject(variantsPrefix(row.s3_key));
      } catch {
        // S3 删除失败时记录日志，不阻塞主流程
        console.error("Failed to delete S3 objects for image", row.id);
      }
    }),
  );
  refresh();
}

export async function bulkSetVisibility(input: {
  imageIds: string[];
  visibility: "public" | "private" | "password";
}) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("images")
    .update({ visibility: input.visibility })
    .in("id", input.imageIds);
  if (error) throw new Error(error.message);
  refresh();
}

export async function bulkAddTags(input: { imageIds: string[]; tagNames: string[] }) {
  await requireAdmin();
  const admin = createAdminClient();
  const names = [...new Set(input.tagNames.map((n) => n.trim()).filter(Boolean))];
  for (const name of names) {
    const { data: tag, error: tagError } = await admin
      .from("tags")
      .upsert({ name }, { onConflict: "name" })
      .select("id")
      .single();
    if (tagError) throw new Error(tagError.message);
    const { error: linkError } = await admin
      .from("image_tags")
      .insert(input.imageIds.map((imageId) => ({ image_id: imageId, tag_id: tag.id })));
    if (linkError) throw new Error(linkError.message);
  }
  refresh();
}

export async function bulkMoveToAlbum(input: { imageIds: string[]; albumId: string }) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("album_images").insert(
    input.imageIds.map((imageId) => ({
      album_id: input.albumId,
      image_id: imageId,
    })),
  );
  if (error) throw new Error(error.message);
  refresh();
}
