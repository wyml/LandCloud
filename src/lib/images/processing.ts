import "server-only";

import crypto from "node:crypto";
import exifReader from "exif-reader";
import heicConvert from "heic-convert";
import sharp from "sharp";
import {
  DISPLAY_MAX_EDGE,
  DISPLAY_QUALITY,
  THUMB_QUALITY,
  THUMB_SIZES,
  imagePrefix,
  variantKey,
} from "@/lib/images/variants";
import { extractMotionPhoto } from "@/lib/images/motion-photo";
import { getObjectBuffer, putObject } from "@/lib/s3";
import { createAdminClient } from "@/lib/supabase/admin";

export function sha256Hex(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

interface ParsedExif {
  Image?: Record<string, unknown>;
  Photo?: Record<string, unknown>;
  GPSInfo?: {
    GPSLatitude?: number[];
    GPSLatitudeRef?: string;
    GPSLongitude?: number[];
    GPSLongitudeRef?: string;
    [key: string]: unknown;
  };
  GPSLatitude?: number[];
  GPSLatitudeRef?: string;
  GPSLongitude?: number[];
  GPSLongitudeRef?: string;
  [key: string]: unknown;
}

function gpsToDecimal(values: number[] | undefined, ref: string | undefined): number | null {
  if (!values || values.length < 3 || !ref) return null;
  const [deg, min, sec] = values;
  if ([deg, min, sec].some((v) => typeof v !== "number" || Number.isNaN(v))) {
    return null;
  }
  let decimal = deg + min / 60 + sec / 3600;
  if (ref.toUpperCase() === "S" || ref.toUpperCase() === "W") decimal = -decimal;
  return decimal;
}

function parseExifDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  
  // 尝试多种EXIF日期格式
  const patterns = [
    // "YYYY:MM:DD HH:MM:SS" (标准EXIF格式)
    /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/,
    // "YYYY-MM-DD HH:MM:SS" (某些相机使用)
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/,
    // "YYYY:MM:DD" (只有日期，没有时间)
    /^(\d{4}):(\d{2}):(\d{2})$/,
    // "YYYY-MM-DD" (只有日期，没有时间)
    /^(\d{4})-(\d{2})-(\d{2})$/,
  ];
  
  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match) {
      const year = match[1];
      const month = match[2];
      const day = match[3];
      const hour = match[4] || "00";
      const minute = match[5] || "00";
      const second = match[6] || "00";
      
      const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
      const date = new Date(iso);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }
  
  return null;
}

function extractExif(buffer: Buffer): {
  clean: Record<string, unknown>;
  gpsLat: number | null;
  gpsLng: number | null;
  takenAt: string | null;
} {
  let parsed: ParsedExif | null = null;
  try {
    parsed = exifReader(buffer) as ParsedExif;
  } catch {
    parsed = null;
  }
  if (!parsed) {
    return { clean: {}, gpsLat: null, gpsLng: null, takenAt: null };
  }

  const image = parsed.Image ?? {};
  const photo = parsed.Photo ?? {};

  const clean: Record<string, unknown> = {};
  const fields: Array<[string, unknown]> = [
    ["make", image.Make],
    ["model", image.Model],
    ["lensModel", photo.LensModel],
    ["fNumber", photo.FNumber],
    ["exposureTime", photo.ExposureTime],
    ["focalLength", photo.FocalLength],
    ["iso", photo.ISOSpeedRatings],
    ["dateTimeOriginal", photo.DateTimeOriginal],
  ];
  for (const [key, value] of fields) {
    if (value !== undefined && value !== null && value !== "") clean[key] = value;
  }

  const gps = parsed.GPSInfo ?? parsed;
  const gpsLat = gpsToDecimal(gps.GPSLatitude, gps.GPSLatitudeRef);
  const gpsLng = gpsToDecimal(gps.GPSLongitude, gps.GPSLongitudeRef);

  // 尝试多个日期字段，按优先级排序
  const dateFields = [
    photo.DateTimeOriginal,    // 拍摄时间（最优先）
    photo.DateTimeDigitized,   // 数字化时间
    image.DateTime,            // 修改时间（最后）
  ];
  
  let takenAt: string | null = null;
  for (const field of dateFields) {
    takenAt = parseExifDate(field);
    if (takenAt) break;
  }

  return {
    clean,
    gpsLat,
    gpsLng,
    takenAt,
  };
}

async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  const output = await heicConvert({
    buffer: buffer as unknown as ArrayBuffer,
    format: "JPEG",
    quality: 0.9,
  });
  return Buffer.from(output as unknown as ArrayBuffer);
}

export async function processImage(imageId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: image, error } = await admin.from("images").select("*").eq("id", imageId).single();
  if (error || !image) {
    throw new Error(`Image not found: ${imageId}`);
  }

  await admin.from("images").update({ processing_status: "processing" }).eq("id", imageId);

  try {
    const original: Buffer = await getObjectBuffer(image.s3_key);
    const isSvg = image.mime === "image/svg+xml";
    const isGif = image.mime === "image/gif";
    const isHeic = image.mime === "image/heic" || image.mime === "image/heif";

    let isLivePhoto = image.is_live_photo;
    let livePhotoVideoKey: string | null = image.live_photo_video_key;

    if (!isLivePhoto && !isSvg && !isGif && !isHeic) {
      try {
        const motionResult = await extractMotionPhoto(original, image.mime);
        if (motionResult) {
          const videoId = crypto.randomUUID();
          const videoKey = `${imagePrefix(videoId)}/original.${motionResult.videoMime === "video/mp4" ? "mp4" : "mov"}`;
          await putObject(videoKey, motionResult.videoBuffer, motionResult.videoMime);
          isLivePhoto = true;
          livePhotoVideoKey = videoKey;
          await admin
            .from("images")
            .update({ is_live_photo: true, live_photo_video_key: videoKey })
            .eq("id", imageId);
        }
      } catch {
        // Motion Photo 提取失败，继续正常处理
      }
    }

    const isVideo = isLivePhoto && livePhotoVideoKey;

    let width: number | null = null;
    let height: number | null = null;
    let exifInfo: ReturnType<typeof extractExif> = {
      clean: {},
      gpsLat: null,
      gpsLng: null,
      takenAt: null,
    };

    if (isVideo) {
      if (isHeic) {
        try {
          exifInfo = extractExif(original);
        } catch {
          // HEIC EXIF extraction failed, try from converted JPEG
        }
      }

      const processBuffer = isHeic ? await convertHeicToJpeg(original) : original;
      const meta = await sharp(processBuffer).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;

      if (!isHeic && meta.exif) {
        exifInfo = extractExif(meta.exif);
      }

      const display = await sharp(processBuffer)
        .rotate()
        .resize({
          width: DISPLAY_MAX_EDGE,
          height: DISPLAY_MAX_EDGE,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: DISPLAY_QUALITY })
        .toBuffer();
      await putObject(variantKey(image.s3_key, "display", "webp"), display, "image/webp");

      for (const [variant, size] of Object.entries(THUMB_SIZES)) {
        const source = sharp(processBuffer).rotate();
        const thumb = await source
          .resize({
            width: size,
            height: size,
            fit: "inside",
            withoutEnlargement: false,
          })
          .webp({ quality: THUMB_QUALITY })
          .toBuffer();
        await putObject(
          variantKey(image.s3_key, variant as keyof typeof THUMB_SIZES, "webp"),
          thumb,
          "image/webp",
        );
      }

      const update: Record<string, unknown> = {
        processing_status: "done",
        exif: exifInfo.clean,
      };
      if (width !== null) update.width = width;
      if (height !== null) update.height = height;
      if (exifInfo.gpsLat !== null) update.gps_lat = exifInfo.gpsLat;
      if (exifInfo.gpsLng !== null) update.gps_lng = exifInfo.gpsLng;
      if (!image.taken_at && exifInfo.takenAt) update.taken_at = exifInfo.takenAt;

      const { error: updateError } = await admin.from("images").update(update).eq("id", imageId);
      if (updateError) throw updateError;
    } else if (!isSvg) {
      if (isHeic) {
        try {
          exifInfo = extractExif(original);
        } catch {
          // HEIC EXIF extraction failed, try from converted JPEG
        }
      }

      const processBuffer = isHeic ? await convertHeicToJpeg(original) : original;
      const meta = await sharp(processBuffer).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;

      if (!isHeic && meta.exif) {
        exifInfo = extractExif(meta.exif);
      }

      if (!isGif) {
        const display = await sharp(processBuffer)
          .rotate()
          .resize({
            width: DISPLAY_MAX_EDGE,
            height: DISPLAY_MAX_EDGE,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: DISPLAY_QUALITY })
          .toBuffer();
        await putObject(variantKey(image.s3_key, "display", "webp"), display, "image/webp");
      }

      for (const [variant, size] of Object.entries(THUMB_SIZES)) {
        const source = sharp(processBuffer).rotate();
        const thumb = await source
          .resize({
            width: size,
            height: size,
            fit: "inside",
            withoutEnlargement: false,
          })
          .webp({ quality: THUMB_QUALITY })
          .toBuffer();
        await putObject(
          variantKey(image.s3_key, variant as keyof typeof THUMB_SIZES, "webp"),
          thumb,
          "image/webp",
        );
      }

      const update: Record<string, unknown> = {
        processing_status: "done",
        exif: exifInfo.clean,
      };
      if (width !== null) update.width = width;
      if (height !== null) update.height = height;
      if (exifInfo.gpsLat !== null) update.gps_lat = exifInfo.gpsLat;
      if (exifInfo.gpsLng !== null) update.gps_lng = exifInfo.gpsLng;
      if (!image.taken_at && exifInfo.takenAt) update.taken_at = exifInfo.takenAt;

      const { error: updateError } = await admin.from("images").update(update).eq("id", imageId);
      if (updateError) throw updateError;
    } else {
      const meta = await sharp(original, { density: 96 }).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;

      const update: Record<string, unknown> = {
        processing_status: "done",
        exif: {},
      };
      if (width !== null) update.width = width;
      if (height !== null) update.height = height;

      const { error: updateError } = await admin.from("images").update(update).eq("id", imageId);
      if (updateError) throw updateError;
    }
  } catch (error) {
    await admin.from("images").update({ processing_status: "failed" }).eq("id", imageId);
    throw error;
  }
}
