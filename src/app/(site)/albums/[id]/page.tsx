import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { Gallery } from "@/components/site/gallery";
import { PasswordForm } from "@/components/site/password-form";
import { ViewTracker } from "@/components/site/view-tracker";
import { readAlbumAccess } from "@/lib/security";
import { getPublicAlbumDetail } from "@/server/queries/public";
import { ArrowLeft, Images, Eye } from "lucide-react";

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

  const coverImage = result.album.cover;

  return (
    <div className="flex flex-col gap-6">
      {/* Immersive Header */}
      <div className="relative -mx-4 -mt-6 overflow-hidden px-4 py-0">
        <div className="relative overflow-hidden rounded-2xl">
          {/* Background */}
          {coverImage ? (
            <div className="relative h-[30vh] min-h-[200px] max-h-[360px] overflow-hidden">
              <Image
                src={coverImage.id}
                alt=""
                fill
                sizes="100vw"
                quality={70}
                className="scale-110 object-cover blur-[4px]"
              />
              <div className="hero-overlay absolute inset-0" />
            </div>
          ) : (
            <div className="h-[20vh] min-h-[160px] bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-900 dark:to-neutral-950" />
          )}

          {/* Info overlay */}
          <div className={coverImage ? "absolute inset-x-0 bottom-0 z-10 p-6" : "p-6"}>
            <Link
              href="/albums"
              className="mb-3 inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white dark:text-white/50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              返回相册列表
            </Link>
            <h1 className={`text-2xl font-bold tracking-tight drop-shadow-md ${coverImage ? "text-white" : ""}`}>
              {result.album.name}
            </h1>
            {result.album.description && (
              <p className={`mt-2 max-w-xl text-sm drop-shadow-sm ${coverImage ? "text-white/70" : "opacity-70"}`}>
                {result.album.description}
              </p>
            )}
            <div className={`mt-3 flex items-center gap-4 text-xs ${coverImage ? "text-white/60" : "opacity-50"}`}>
              <span className="flex items-center gap-1">
                <Images className="h-3.5 w-3.5" />
                {result.album.imageCount} 张图片
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {result.album.view_count} 次浏览
              </span>
            </div>
          </div>
        </div>
      </div>

      <ViewTracker type="album" id={id} />
      <Gallery albumId={id} initialImages={result.images.slice(0, 30)} />
    </div>
  );
}
