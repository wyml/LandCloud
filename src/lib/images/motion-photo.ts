import "server-only";

import { parseLivePhotoServer } from "./live-photo-parser";

export interface MotionPhotoResult {
  imageBuffer: Buffer;
  videoBuffer: Buffer;
  videoMime: string;
}

export async function extractMotionPhoto(buffer: Buffer, mime: string): Promise<MotionPhotoResult | null> {
  const result = await parseLivePhotoServer(buffer, mime);

  if (!result.isLivePhoto || !result.videoBuffer) {
    return null;
  }

  return {
    imageBuffer: result.imageBuffer,
    videoBuffer: result.videoBuffer,
    videoMime: "video/mp4",
  };
}
