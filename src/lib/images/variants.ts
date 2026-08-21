export const ACCEPTED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "image/heic": "heic",
  "image/heif": "heif",
};

export const LIVE_PHOTO_MIME: Record<string, string> = {
  "video/quicktime": "mov",
  "video/mp4": "mp4",
};

export const MAX_FILE_SIZE = 50 * 1024 * 1024;
export const MAX_BATCH_SIZE = 50;
export const PRESIGN_EXPIRES_SECONDS = 600;

export const DISPLAY_MAX_EDGE = 2560;
export const DISPLAY_QUALITY = 80;
export const THUMB_QUALITY = 75;

export const THUMB_SIZES = {
  thumb_lg: 800,
  thumb_md: 480,
  thumb_sm: 160,
} as const;

export type ThumbVariant = keyof typeof THUMB_SIZES;
export type Variant = "original" | "display" | ThumbVariant;

export function isAcceptedMime(mime: string): mime is keyof typeof ACCEPTED_MIME {
  return mime in ACCEPTED_MIME;
}

export function isAcceptedLivePhotoMime(mime: string): mime is keyof typeof LIVE_PHOTO_MIME {
  return mime in LIVE_PHOTO_MIME;
}

export function isAcceptedFile(mime: string): boolean {
  return isAcceptedMime(mime) || isAcceptedLivePhotoMime(mime);
}

export function imagePrefix(imageId: string, date: Date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `images/${yyyy}/${mm}/${imageId}`;
}

export function variantKey(s3Key: string, variant: Variant, ext: string): string {
  const dir = s3Key.slice(0, s3Key.lastIndexOf("/") + 1);
  return `${dir}${variant}.${ext}`;
}

export function variantsPrefix(s3Key: string): string {
  return s3Key.slice(0, s3Key.lastIndexOf("/") + 1);
}

export function detectMimeByMagic(buffer: Buffer): string | null {
  if (buffer.length < 16) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png";
  }
  if (
    buffer.subarray(0, 6).toString("ascii") === "GIF87a" ||
    buffer.subarray(0, 6).toString("ascii") === "GIF89a"
  ) {
    return "image/gif";
  }
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  if (buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (brand === "avif" || brand === "avis") return "image/avif";
    if (brand === "heic" || brand === "heix" || brand === "mif1") return "image/heic";
    if (brand === "heim" || brand === "heis") return "image/heif";
  }
  const head = buffer.subarray(0, 1024).toString("utf8").trim();
  if (head.startsWith("<?xml") || head.startsWith("<svg")) {
    return "image/svg+xml";
  }
  return null;
}
