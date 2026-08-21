export interface ImageRow {
  id: string;
  title: string;
  description: string;
  original_name: string;
  mime: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  sha256: string;
  s3_key: string;
  visibility: "public" | "private" | "password" | "hidden";
  taken_at: string | null;
  exif: Record<string, unknown>;
  gps_lat: number | null;
  gps_lng: number | null;
  view_count: number;
  processing_status: "pending" | "processing" | "done" | "failed";
  is_live_photo: boolean;
  live_photo_video_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlbumRow {
  id: string;
  name: string;
  description: string;
  cover_image_id: string | null;
  visibility: "public" | "private" | "password" | "hidden";
  sort_order: number;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface TagRow {
  id: string;
  name: string;
  created_at: string;
}

export interface ImageWithRelations extends ImageRow {
  tags: Array<{ id: string; name: string }>;
  albumIds: string[];
  albums: Array<{ id: string; name: string }>;
}

export interface AlbumOption {
  id: string;
  name: string;
  visibility: AlbumRow["visibility"];
}

export interface TagWithCount extends TagRow {
  count: number;
}

export interface SiteSettings {
  name: string;
  logo: string;
  description: string;
  footer: string;
  defaultPublic: boolean;
  privateMode: boolean;
  homepageTemplate: "classic" | "globe";
}

export interface ExternalLinkSettings {
  directBase: string;
  defaultType: "direct" | "proxy";
}

export interface PublicImage {
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

export interface PublicAlbum {
  id: string;
  name: string;
  description: string;
  visibility: AlbumRow["visibility"];
  imageCount: number;
  view_count: number;
  cover: { id: string; s3_key: string; title: string } | null;
  updated_at: string;
}
