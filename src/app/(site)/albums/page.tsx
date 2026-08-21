import type { Metadata } from "next";

import { AlbumGrid } from "@/components/site/album-grid";
import { SectionReveal } from "@/components/site/section-reveal";
import { listPublicAlbums } from "@/server/queries/public";
import { getSiteSettings } from "@/server/queries/settings";
import { Images } from "lucide-react";

export const metadata: Metadata = { title: "相册" };

export default async function AlbumsPage() {
  const albums = await listPublicAlbums();
  const settings = await getSiteSettings();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="flex items-center gap-2.5 text-2xl font-semibold">
        <Images className="h-6 w-6 text-[var(--accent)]" />
        {settings.name} · 相册
      </h1>
      <SectionReveal>
        <AlbumGrid albums={albums} />
      </SectionReveal>
    </div>
  );
}
