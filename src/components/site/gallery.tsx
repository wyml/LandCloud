"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { PublicImage } from "@/lib/types";

export function Gallery({
  albumId,
  initialImages,
  pageSize = 30,
  shareId,
}: {
  albumId: string;
  initialImages: PublicImage[];
  pageSize?: number;
  shareId?: string;
}) {
  const [images, setImages] = useState(initialImages);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialImages.length >= pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(initialImages.length);

  const loadMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        album: albumId,
        offset: String(offsetRef.current),
        limit: String(pageSize),
      });
      if (shareId) params.set("share", shareId);
      const res = await fetch(`/api/gallery?${params.toString()}`);
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { images: PublicImage[]; hasMore: boolean };
      if (data.images.length === 0) setHasMore(false);
      else {
        setImages((prev) => [...prev, ...data.images]);
        offsetRef.current += data.images.length;
        setHasMore(data.hasMore);
      }
    } finally {
      setLoading(false);
    }
  }, [albumId, loading, pageSize, shareId]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          void loadMore();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") {
        setLightboxIndex((i) => (i === null ? null : Math.max(0, i - 1)));
      }
      if (e.key === "ArrowRight") {
        setLightboxIndex((i) => (i === null ? null : Math.min(images.length - 1, i + 1)));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, images.length]);

  if (images.length === 0) {
    return <p className="py-10 text-center opacity-60">相册暂无公开图片</p>;
  }

  const active = lightboxIndex !== null ? images[lightboxIndex] : null;

  return (
    <div>
      <div className="columns-2 gap-3 md:columns-3 lg:columns-4 [&>*]:mb-3">
        {images.map((image, index) => (
          <div key={image.id} className="break-inside-avoid">
            <button
              type="button"
              onClick={() => setLightboxIndex(index)}
              className="group relative block w-full overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900"
            >
              <Image
                src={image.id}
                alt={image.title || image.original_name}
                width={image.width && image.width > 0 ? image.width : 800}
                height={image.height && image.height > 0 ? image.height : 600}
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                className="h-auto w-full transition-transform duration-300 group-hover:scale-[1.03]"
              />
              {image.title ? (
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {image.title}
                </span>
              ) : null}
            </button>
          </div>
        ))}
      </div>

      <div ref={sentinelRef} className="h-px" />
      {loading && <p className="py-6 text-center text-sm opacity-60">加载中…</p>}
      {!hasMore && images.length > 0 && (
        <p className="py-6 text-center text-sm opacity-40">已加载全部图片</p>
      )}

      {active ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxIndex(null)}
        >
          <div className="flex items-center justify-between p-3 text-white">
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i === null ? null : Math.max(0, i - 1)));
              }}
            >
              上一张
            </button>
            <span className="truncate text-sm">
              {active.title || active.original_name}（{lightboxIndex! + 1}/{images.length}）
            </span>
            <div className="flex items-center gap-2">
              <a
                href={`/f/${active.id}/original`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded-lg px-3 py-1.5 hover:bg-white/10"
              >
                原图
              </a>
              {!shareId ? (
                <Link
                  href={`/images/${active.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-lg px-3 py-1.5 hover:bg-white/10"
                >
                  详情
                </Link>
              ) : null}
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((i) => (i === null ? null : Math.min(images.length - 1, i + 1)));
                }}
              >
                下一张
              </button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
            <Image
              src={active.id}
              alt=""
              width={active.width && active.width > 0 ? active.width : 2560}
              height={active.height && active.height > 0 ? active.height : 1920}
              sizes="100vw"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
