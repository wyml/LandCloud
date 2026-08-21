import type { LivePhotoInput, LivePhotoResult, XmpVideoInfo, MotionPhotoVendor } from "./live-photo-types";

const JPEG_MAGIC = 0xffd8;
const JPEG_EOI = 0xffd9;
const JPEG_APP1 = 0xffe1;

const XMP_NAMESPACE = "http://ns.adobe.com/xap/1.0/";

const XMP_PATTERNS: Array<{ pattern: RegExp; vendor: MotionPhotoVendor }> = [
  { pattern: /GCamera:MicroVideo[^"]*"\s*=\s*"(\d+)"/i, vendor: "google" },
  { pattern: /GCamera:MicroVideoOffset\s*=\s*"?(\d+)"?/i, vendor: "google" },
  { pattern: /GCamera:MotionPhoto\s*=\s*"?(\d+)"?/i, vendor: "google" },
  { pattern: /Container:Item[^>]*Item:Length\s*=\s*"(\d+)"/i, vendor: "generic" },
  { pattern: /Item:Length\s*=\s*"(\d+)"/i, vendor: "generic" },
  { pattern: /Samsung:MotionPhoto[^"]*"\s*=\s*"(\d+)"/i, vendor: "samsung" },
  { pattern: /Xiaomi:MotionVideo[^"]*"\s*=\s*"(\d+)"/i, vendor: "xiaomi" },
  { pattern: /MiMotionPhoto[^"]*"\s*=\s*"(\d+)"/i, vendor: "xiaomi" },
  { pattern: /Oppo:MotionPhoto[^"]*"\s*=\s*"(\d+)"/i, vendor: "oppo" },
  { pattern: /Vivo:MotionPhoto[^"]*"\s*=\s*"(\d+)"/i, vendor: "vivo" },
  { pattern: /MotionPhotoVideoOffset\s*=\s*"?(\d+)"?/i, vendor: "generic" },
  { pattern: /VideoSize\s*=\s*"?(\d+)"?/i, vendor: "generic" },
  { pattern: /VideoLength\s*=\s*"?(\d+)"?/i, vendor: "generic" },
];

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && ((bytes[0] << 8) | bytes[1]) === JPEG_MAGIC;
}

function isHeic(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  if (bytes[4] !== 0x66 || bytes[5] !== 0x74 || bytes[6] !== 0x79 || bytes[7] !== 0x70) return false;
  const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  return brand === "heic" || brand === "heix" || brand === "mif1" || brand === "heic";
}

function isMp4(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  if (bytes[4] !== 0x66 || bytes[5] !== 0x74 || bytes[6] !== 0x79 || bytes[7] !== 0x70) return false;
  return true;
}

function findXmpInJpeg(bytes: Uint8Array): string | null {
  let offset = 2;
  while (offset < bytes.length - 4) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    if (marker === JPEG_APP1) {
      const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
      const segmentStart = offset + 4;
      const segmentEnd = offset + 2 + segmentLength;
      const segmentData = bytes.slice(segmentStart, Math.min(segmentEnd, bytes.length));
      const text = new TextDecoder("utf-8", { fatal: false }).decode(segmentData);
      if (text.includes(XMP_NAMESPACE)) {
        const xmpStart = text.indexOf("<x:xmpmeta");
        const xmpEnd = text.indexOf("</x:xmpmeta>");
        if (xmpStart !== -1 && xmpEnd !== -1) {
          return text.substring(xmpStart, xmpEnd + 13);
        }
        const rdfStart = text.indexOf("<rdf:RDF");
        if (rdfStart !== -1) {
          return text.substring(rdfStart);
        }
      }
      offset = segmentEnd;
    } else if (marker === 0xda) {
      break;
    } else {
      const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
      offset += 2 + segmentLength;
    }
  }
  return null;
}

function parseXmpVideoLength(xmp: string): XmpVideoInfo | null {
  for (const { pattern } of XMP_PATTERNS) {
    const match = xmp.match(pattern);
    if (match) {
      const length = parseInt(match[1], 10);
      if (length > 1000) {
        return { offset: 0, length };
      }
    }
  }

  const itemLengthRegex = /Item:Length\s*=\s*"(\d+)"/gi;
  const lengths: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = itemLengthRegex.exec(xmp)) !== null) {
    lengths.push(parseInt(m[1], 10));
  }
  if (lengths.length > 0) {
    const maxLen = Math.max(...lengths);
    if (maxLen > 1000) {
      return { offset: 0, length: maxLen };
    }
  }

  return null;
}

function findFtypInData(bytes: Uint8Array, start: number, end: number): number {
  for (let i = start; i < end - 8; i++) {
    if (
      bytes[i + 4] === 0x66 &&
      bytes[i + 5] === 0x74 &&
      bytes[i + 6] === 0x79 &&
      bytes[i + 7] === 0x70
    ) {
      const possibleSize = (bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3];
      if (possibleSize >= 8 && possibleSize < 100) {
        return i;
      }
    }
  }
  return -1;
}

function findLastEoi(bytes: Uint8Array, before: number): number {
  for (let i = Math.min(before - 1, bytes.length - 2); i >= 2; i--) {
    if (bytes[i - 1] === 0xff && bytes[i] === JPEG_EOI) {
      return i + 1;
    }
  }
  return -1;
}

function parseMotionPhotoJpeg(file: File, bytes: Uint8Array): LivePhotoResult {
  const xmp = findXmpInJpeg(bytes);
  let videoLength: number | null = null;

  if (xmp) {
    const info = parseXmpVideoLength(xmp);
    if (info) {
      videoLength = info.length;
    }
  }

  if (videoLength && videoLength < file.size) {
    const splitIndex = file.size - videoLength;
    if (splitIndex > 0 && splitIndex < file.size) {
      const imageBlob = file.slice(0, splitIndex, "image/jpeg");
      const videoBlob = file.slice(splitIndex, file.size, "video/mp4");
      return { imageBlob, videoBlob };
    }
  }

  const searchStart = Math.max(0, bytes.length - 50 * 1024 * 1024);
  const ftypOffset = findFtypInData(bytes, searchStart, bytes.length);

  if (ftypOffset > 0) {
    const splitPoint = findLastEoi(bytes, ftypOffset);
    if (splitPoint > 0 && splitPoint < ftypOffset) {
      const imageBlob = file.slice(0, splitPoint, "image/jpeg");
      const videoBlob = file.slice(splitPoint, file.size, "video/mp4");
      return { imageBlob, videoBlob };
    }
    const imageBlob = file.slice(0, ftypOffset, "image/jpeg");
    const videoBlob = file.slice(ftypOffset, file.size, "video/mp4");
    return { imageBlob, videoBlob };
  }

  return { imageBlob: file, videoBlob: null };
}

function parseHeic(file: File, bytes: Uint8Array): LivePhotoResult {
  let offset = 0;
  let hasVideoTrack = false;
  let mdatOffset = -1;

  while (offset < bytes.length - 8) {
    const boxSize = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    const boxType = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);

    if (boxSize < 8) break;

    if (boxType === "moov") {
      const moovData = bytes.slice(offset + 8, offset + boxSize);
      const moovText = new TextDecoder("utf-8", { fatal: false }).decode(moovData);
      if (moovText.includes("vide")) {
        hasVideoTrack = true;
      }
    }

    if (boxType === "mdat") {
      mdatOffset = offset;
    }

    offset += boxSize;
  }

  if (hasVideoTrack && mdatOffset > 0) {
    return { imageBlob: file, videoBlob: null };
  }

  return { imageBlob: file, videoBlob: null };
}

export function isLivePhotoFile(file: File): boolean {
  const ext = file.name.toLowerCase();
  return (
    ext.endsWith(".jpg") ||
    ext.endsWith(".jpeg") ||
    ext.endsWith(".heic") ||
    ext.endsWith(".heif") ||
    ext.endsWith(".mp4") ||
    ext.endsWith(".mov")
  );
}

export async function parseLivePhoto(input: LivePhotoInput): Promise<LivePhotoResult> {
  if ("imageFile" in input && "videoFile" in input) {
    return {
      imageBlob: input.imageFile,
      videoBlob: input.videoFile,
    };
  }

  const file = input;
  const headerSize = Math.min(file.size, 256 * 1024);
  const headerBuffer = await file.slice(0, headerSize).arrayBuffer();
  const headerBytes = new Uint8Array(headerBuffer);

  if (isJpeg(headerBytes)) {
    return parseMotionPhotoJpeg(file, headerBytes);
  }

  if (isHeic(headerBytes)) {
    return parseHeic(file, headerBytes);
  }

  if (isMp4(headerBytes)) {
    return { imageBlob: file, videoBlob: null };
  }

  return { imageBlob: file, videoBlob: null };
}

export async function parseLivePhotoServer(buffer: Buffer, mime: string): Promise<{
  imageBuffer: Buffer;
  videoBuffer: Buffer | null;
  isLivePhoto: boolean;
}> {
  if (mime === "image/jpeg" || mime === "image/jpg") {
    const bytes = new Uint8Array(buffer);
    const xmp = findXmpInJpeg(bytes);
    let videoLength: number | null = null;

    if (xmp) {
      const info = parseXmpVideoLength(xmp);
      if (info) {
        videoLength = info.length;
      }
    }

    if (videoLength && videoLength < buffer.length) {
      const splitIndex = buffer.length - videoLength;
      if (splitIndex > 0 && splitIndex < buffer.length) {
        return {
          imageBuffer: buffer.subarray(0, splitIndex),
          videoBuffer: buffer.subarray(splitIndex),
          isLivePhoto: true,
        };
      }
    }

    const searchStart = Math.max(0, buffer.length - 50 * 1024 * 1024);
    const ftypOffset = findFtypInData(bytes, searchStart, bytes.length);

    if (ftypOffset > 0) {
      const splitPoint = findLastEoi(bytes, ftypOffset);
      if (splitPoint > 0 && splitPoint < ftypOffset) {
        return {
          imageBuffer: buffer.subarray(0, splitPoint),
          videoBuffer: buffer.subarray(splitPoint),
          isLivePhoto: true,
        };
      }
      return {
        imageBuffer: buffer.subarray(0, ftypOffset),
        videoBuffer: buffer.subarray(ftypOffset),
        isLivePhoto: true,
      };
    }
  }

  return { imageBuffer: buffer, videoBuffer: null, isLivePhoto: false };
}
