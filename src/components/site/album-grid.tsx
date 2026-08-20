import Image from "next/image";
import Link from "next/link";

import type { PublicAlbum } from "@/lib/types";

export function AlbumGrid({ albums }: { albums: PublicAlbum[] }) {
  if (albums.length === 0) {
    return <p className="py-10 text-center opacity-60">暂无公开相册</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {albums.map((album) => (
        <Link
          key={album.id}
          href={`/albums/${album.id}`}
          className="group overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"
        >
          <div className="relative aspect-video w-full bg-neutral-100 dark:bg-neutral-900">
            {album.cover ? (
              <Image
                src={album.cover.id}
                alt={album.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm opacity-40">
                暂无封面
              </div>
            )}
            <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
              {album.imageCount} 张
            </span>
          </div>
          <div className="p-3">
            <h3 className="truncate font-medium">{album.name}</h3>
            {album.description && (
              <p className="mt-1 line-clamp-2 text-xs opacity-60">{album.description}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
