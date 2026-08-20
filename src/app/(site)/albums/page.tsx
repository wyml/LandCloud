import type { Metadata } from "next";

import { AlbumGrid } from "@/components/site/album-grid";
import { listPublicAlbums } from "@/server/queries/public";
import { getSiteSettings } from "@/server/queries/settings";

export const metadata: Metadata = { title: "相册" };

export default async function AlbumsPage() {
  const albums = await listPublicAlbums();
  const settings = await getSiteSettings();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{settings.name} · 相册</h1>
      <AlbumGrid albums={albums} />
    </div>
  );
}
