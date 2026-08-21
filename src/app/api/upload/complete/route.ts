import { NextResponse } from "next/server";
import { badRequest, guardUploadAccess, parseJsonBody } from "@/lib/api";
import { processImage, sha256Hex } from "@/lib/images/processing";
import { detectMimeByMagic } from "@/lib/images/variants";
import { deleteObject, getObjectBuffer, objectExists } from "@/lib/s3";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteSettings } from "@/server/queries/settings";

interface CompleteBody {
  key: string;
  originalName: string;
  mime: string;
  size: number;
  albumIds?: string[];
  tagNames?: string[];
  visibility?: "public" | "private" | "password";
  takenAt?: string;
  videoKey?: string;
}

export async function POST(request: Request) {
  const access = await guardUploadAccess(request);
  if (!access.ok) return access.response;

  const body = await parseJsonBody<CompleteBody>(request);
  if (!body || typeof body.key !== "string" || !body.key.startsWith("images/")) {
    return badRequest("key 无效");
  }
  if (typeof body.originalName !== "string" || body.originalName.length === 0) {
    return badRequest("originalName 无效");
  }
  if (typeof body.mime !== "string" || typeof body.size !== "number") {
    return badRequest("mime/size 无效");
  }

  const exists = await objectExists(body.key);
  if (!exists) {
    return badRequest("对象不存在，请先完成直传");
  }
  if (exists.size !== body.size) {
    await deleteObject(body.key);
    return badRequest("文件大小与声明不一致");
  }

  const buffer = await getObjectBuffer(body.key);
  const detected = detectMimeByMagic(buffer);
  if (detected !== body.mime) {
    await deleteObject(body.key);
    return badRequest("文件内容与声明的类型不符");
  }

  const admin = createAdminClient();
  const hash = sha256Hex(buffer);

  const { data: existing } = await admin
    .from("images")
    .select("id, title, sha256, s3_key")
    .eq("sha256", hash)
    .maybeSingle();
  if (existing) {
    await deleteObject(body.key);
    return NextResponse.json({ duplicate: true, image: existing });
  }

  const title = body.originalName.replace(/\.[^.]+$/, "");
  const takenAt =
    body.takenAt && !Number.isNaN(new Date(body.takenAt).getTime())
      ? new Date(body.takenAt).toISOString()
      : null;

  const settings = await getSiteSettings();
  const defaultVisibility = settings.defaultPublic ? "public" : "private";

  const { data: image, error: insertError } = await admin
    .from("images")
    .insert({
      title,
      original_name: body.originalName,
      mime: body.mime,
      size_bytes: body.size,
      sha256: hash,
      s3_key: body.key,
      visibility: body.visibility ?? defaultVisibility,
      taken_at: takenAt,
      processing_status: "pending",
      is_live_photo: !!body.videoKey,
      live_photo_video_key: body.videoKey ?? null,
    })
    .select("*")
    .single();
  if (insertError || !image) {
    await deleteObject(body.key);
    return NextResponse.json({ error: insertError?.message }, { status: 500 });
  }

  if (Array.isArray(body.albumIds) && body.albumIds.length > 0) {
    await admin.from("album_images").insert(
      body.albumIds.map((albumId) => ({
        album_id: albumId,
        image_id: image.id,
      })),
    );
  }

  if (Array.isArray(body.tagNames) && body.tagNames.length > 0) {
    const names = [...new Set(body.tagNames.map((n) => n.trim()).filter(Boolean))];
    for (const name of names) {
      const { data: tag } = await admin
        .from("tags")
        .upsert({ name }, { onConflict: "name" })
        .select("id")
        .single();
      if (tag) {
        await admin.from("image_tags").upsert({ image_id: image.id, tag_id: tag.id });
      }
    }
  }

  try {
    await processImage(image.id);
  } catch {
    // 状态已置为 failed，前端可触发重试
  }

  const { data: finalImage } = await admin.from("images").select("*").eq("id", image.id).single();

  return NextResponse.json({ duplicate: false, image: finalImage });
}
