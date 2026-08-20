import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { Gallery } from "@/components/site/gallery";
import { PasswordForm } from "@/components/site/password-form";
import { ViewTracker } from "@/components/site/view-tracker";
import { readAlbumAccess } from "@/lib/security";
import { getPublicAlbumDetail } from "@/server/queries/public";

export async function generateMetadata({ params }: PageProps<"/albums/[id]">): Promise<Metadata> {
  const { id } = await params;
  const result = await getPublicAlbumDetail(id);
  if (!result) return {};
  return {
    title: result.album.name,
    description: result.album.description || undefined,
    openGraph: {
      title: result.album.name,
      description: result.album.description || undefined,
      type: "website",
    },
  };
}

export default async function AlbumDetailPage({ params }: PageProps<"/albums/[id]">) {
  const { id } = await params;
  const result = await getPublicAlbumDetail(id);
  if (!result) notFound();

  const cookieStore = await cookies();
  const granted = readAlbumAccess(cookieStore.get("album_access")?.value);
  const isLocked = result.album.visibility === "password" && !granted.includes(id);

  if (isLocked) {
    return (
      <div className="py-12">
        <PasswordForm albumId={id} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{result.album.name}</h1>
        {result.album.description && <p className="mt-2 opacity-70">{result.album.description}</p>}
        <p className="mt-1 text-xs opacity-50">
          {result.album.imageCount} 张图片 · {result.album.view_count} 次浏览
        </p>
      </div>
      <ViewTracker type="album" id={id} />
      <Gallery albumId={id} initialImages={result.images.slice(0, 30)} />
    </div>
  );
}
