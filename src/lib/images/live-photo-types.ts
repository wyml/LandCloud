export interface LivePhotoResult {
  imageBlob: Blob;
  videoBlob: Blob | null;
}

export interface LivePhotoFilePair {
  imageFile: File;
  videoFile: File;
}

export type LivePhotoInput = File | LivePhotoFilePair;

export interface XmpVideoInfo {
  offset: number;
  length: number;
}

export type MotionPhotoVendor =
  | "google"
  | "samsung"
  | "xiaomi"
  | "oppo"
  | "vivo"
  | "generic"
  | null;
