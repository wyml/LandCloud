import "server-only";

import { getTotalStorageBytes } from "@/server/queries/images";
import { createAdminClient } from "@/lib/supabase/admin";

export interface RecentImage {
  id: string;
  title: string;
  original_name: string;
  mime: string;
  width: number | null;
  height: number | null;
  processing_status: string;
  visibility: string;
  created_at: string;
}

export interface DashboardStats {
  imageCount: number;
  albumCount: number;
  totalViews: number;
  storageBytes: number;
  recentImages: RecentImage[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const admin = createAdminClient();

  const [imageCountRes, albumCountRes, imageViewsRes, albumViewsRes, storageBytes] =
    await Promise.all([
      admin.from("images").select("id", { count: "exact", head: true }),
      admin.from("albums").select("id", { count: "exact", head: true }),
      admin.from("images").select("view_count"),
      admin.from("albums").select("view_count"),
      getTotalStorageBytes(),
    ]);

  const viewsOf = (rows: unknown) =>
    ((rows as Array<{ view_count: number }>) ?? []).reduce(
      (sum, row) => sum + Number(row.view_count ?? 0),
      0,
    );

  const { data: recent, error } = await admin
    .from("images")
    .select(
      "id, title, original_name, mime, width, height, processing_status, visibility, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(8);

  return {
    imageCount: Number(imageCountRes.count ?? 0),
    albumCount: Number(albumCountRes.count ?? 0),
    totalViews: viewsOf(imageViewsRes.data) + viewsOf(albumViewsRes.data),
    storageBytes,
    recentImages: error ? [] : ((recent as unknown as RecentImage[]) ?? []),
  };
}
