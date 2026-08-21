import type { Metadata } from "next";

import { AlbumGrid } from "@/components/site/album-grid";
import { SectionReveal } from "@/components/site/section-reveal";
import { listPublicAlbums } from "@/server/queries/public";
import { getSiteSettings } from "@/server/queries/settings";
import { getSessionUser, isAdminUser } from "@/lib/auth";
import { Images, Lock } from "lucide-react";

export const metadata: Metadata = { title: "相册" };

export default async function AlbumsPage() {
  const settings = await getSiteSettings();
  const user = await getSessionUser();
  const isAdmin = await isAdminUser(user);
  const isPrivate = settings.privateMode && !isAdmin;

  if (isPrivate) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 opacity-50">
        <Lock className="h-12 w-12" />
        <p className="text-lg">站点已开启私密模式</p>
      </div>
    );
  }

  const albums = await listPublicAlbums();

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
