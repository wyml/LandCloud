import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/env";
import { listPublicAlbums, listPublicTags, listRecentPublicImages } from "@/server/queries/public";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const [albums, tags, images] = await Promise.all([
    listPublicAlbums(),
    listPublicTags(),
    listRecentPublicImages(500),
  ]);

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/albums`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/tags`, changeFrequency: "daily", priority: 0.6 },
    ...albums.map((album) => ({
      url: `${base}/albums/${album.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...tags.map((tag) => ({
      url: `${base}/tags/${encodeURIComponent(tag.name)}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...images.map((image) => ({
      url: `${base}/images/${image.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ];
}
