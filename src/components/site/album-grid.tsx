"use client";

import { motion } from "framer-motion";
import { Images, ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { PublicAlbum } from "@/lib/types";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07 },
  },
} as const;

const item = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

export function AlbumGrid({ albums }: { albums: PublicAlbum[] }) {
  if (albums.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 opacity-50">
        <ImageOff className="h-10 w-10" />
        <p className="text-sm">暂无公开相册</p>
      </div>
    );
  }
  return (
    <motion.div
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {albums.map((album) => (
        <motion.div key={album.id} variants={item}>
          <Link
            href={`/albums/${album.id}`}
            className="group relative block overflow-hidden rounded-2xl border border-neutral-200 bg-[var(--card-bg)] shadow-sm transition-shadow duration-300 hover:shadow-xl dark:border-neutral-800 dark:ring-1 dark:ring-white/5"
          >
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900">
              {album.cover ? (
                <Image
                  src={album.cover.id}
                  alt={album.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  quality={85}
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-neutral-400">
                  <ImageOff className="h-8 w-8" />
                  <span className="text-xs">暂无封面</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-90" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="text-base font-semibold text-white drop-shadow-md transition-transform duration-300 group-hover:translate-y-[-2px]">
                  {album.name}
                </h3>
                {album.description && (
                  <p className="mt-1 line-clamp-1 text-xs text-white/70">{album.description}</p>
                )}
              </div>
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
                <Images className="h-3 w-3" />
                {album.imageCount}
              </span>
            </div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
