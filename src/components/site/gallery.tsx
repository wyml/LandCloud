"use client";

import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  Aperture,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  ExternalLink,
  Loader2,
  ImageIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { PublicImage } from "@/lib/types";
import { LivePhotoPlayer } from "@/components/site/live-photo-player";

const gridContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04 },
  },
} as const;

const gridItem = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

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
  const [direction, setDirection] = useState(0);

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
        setDirection(-1);
        setLightboxIndex((i) => (i === null ? null : Math.max(0, i - 1)));
      }
      if (e.key === "ArrowRight") {
        setDirection(1);
        setLightboxIndex((i) => (i === null ? null : Math.min(images.length - 1, i + 1)));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, images.length]);

  function goPrev() {
    setDirection(-1);
    setLightboxIndex((i) => (i === null ? null : Math.max(0, i - 1)));
  }

  function goNext() {
    setDirection(1);
    setLightboxIndex((i) => (i === null ? null : Math.min(images.length - 1, i + 1)));
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 opacity-40">
        <ImageIcon className="h-10 w-10" />
        <p className="text-sm">相册暂无公开图片</p>
      </div>
    );
  }

  const active = lightboxIndex !== null ? images[lightboxIndex] : null;

  return (
    <div>
      <motion.div
        className="columns-2 gap-3 md:columns-3 lg:columns-4 [&>*]:mb-3"
        variants={gridContainer}
        initial="hidden"
        animate="show"
      >
        {images.map((image, index) => (
          <motion.div key={image.id} variants={gridItem} className="break-inside-avoid">
            <button
              type="button"
              onClick={() => {
                setDirection(0);
                setLightboxIndex(index);
              }}
              className="group relative block w-full overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900"
            >
              <Image
                src={image.id}
                alt={image.title || image.original_name}
                width={image.width && image.width > 0 ? image.width : 800}
                height={image.height && image.height > 0 ? image.height : 600}
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                className="h-auto w-full transition-transform duration-500 ease-out group-hover:scale-110"
              />
              {image.is_live_photo && image.live_photo_video_key ? (
                <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] text-white/90 backdrop-blur-md">
                  <Aperture className="h-3 w-3 animate-pulse" />
                  实况
                </span>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8 text-xs text-white transition-transform duration-300 ease-out group-hover:translate-y-0">
                {image.title ? (
                  <span className="line-clamp-1 drop-shadow-sm">{image.title}</span>
                ) : null}
              </div>
            </button>
          </motion.div>
        ))}
      </motion.div>

      <div ref={sentinelRef} className="h-px" />
      {loading && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm opacity-60">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>加载中…</span>
        </div>
      )}
      {!hasMore && images.length > 0 && (
        <p className="py-6 text-center text-sm opacity-30">— 已加载全部图片 —</p>
      )}

      <AnimatePresence>
        {active ? (
          <Lightbox
            images={images}
            active={active}
            index={lightboxIndex!}
            direction={direction}
            shareId={shareId}
            onClose={() => setLightboxIndex(null)}
            onPrev={goPrev}
            onNext={goNext}
            onGoto={(i) => {
              setDirection(i > lightboxIndex! ? 1 : -1);
              setLightboxIndex(i);
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Lightbox({
  images,
  active,
  index,
  direction,
  shareId,
  onClose,
  onPrev,
  onNext,
  onGoto,
}: {
  images: PublicImage[];
  active: PublicImage;
  index: number;
  direction: number;
  shareId?: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onGoto: (index: number) => void;
}) {
  const dragX = useMotionValue(0);
  const dragOpacity = useTransform(dragX, [-200, 0, 200], [0.5, 1, 0.5]);
  const [isDragging, setIsDragging] = useState(false);

  function handleDragEnd(_e: unknown, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) {
    setIsDragging(false);
    if (Math.abs(info.offset.x) > 100 || Math.abs(info.velocity.x) > 500) {
      if (info.offset.x > 0) onPrev();
      else onNext();
    }
    if (info.offset.y > 150) {
      onClose();
    }
  }

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir >= 0 ? 80 : -80,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir >= 0 ? -80 : 80,
      opacity: 0,
      scale: 0.95,
    }),
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col"
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Blurred background */}
      <div className="absolute inset-0 overflow-hidden bg-black">
        <Image
          src={active.id}
          alt=""
          fill
          sizes="100vw"
          className="scale-110 object-cover opacity-30 blur-[80px]"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Top bar */}
      <motion.div
        className="relative z-10 flex items-center justify-between px-4 py-3"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="关闭"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 flex-1 justify-center px-4">
          <span className="truncate text-sm text-white/80">
            {active.title || active.original_name}
          </span>
          <span className="ml-2 shrink-0 text-sm text-white/40">
            {index + 1} / {images.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <a
            href={`/f/${active.id}/original`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="查看原图"
          >
            <Download className="h-4 w-4" />
          </a>
          {!shareId ? (
            <Link
              href={`/images/${active.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="图片详情"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </motion.div>

      {/* Main image area */}
      <div className="relative z-10 flex flex-1 items-center justify-center overflow-hidden">
        {/* Prev button */}
        {index > 0 && (
          <motion.button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur-md transition-colors hover:bg-white/20 hover:text-white"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            aria-label="上一张"
          >
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
        )}

        {/* Next button */}
        {index < images.length - 1 && (
          <motion.button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur-md transition-colors hover:bg-white/20 hover:text-white"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            aria-label="下一张"
          >
            <ChevronRight className="h-5 w-5" />
          </motion.button>
        )}

        {/* Image */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={active.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            style={{ x: isDragging ? dragX : 0, opacity: isDragging ? dragOpacity : 1 }}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            className="flex max-h-full max-w-full cursor-grab items-center justify-center active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            {active.is_live_photo && active.live_photo_video_key ? (
              <LivePhotoPlayer
                imageId={active.id}
                className="max-h-[85vh] max-w-full"
              />
            ) : (
              <Image
                src={active.id}
                alt=""
                width={active.width && active.width > 0 ? active.width : 2560}
                height={active.height && active.height > 0 ? active.height : 1920}
                sizes="100vw"
                className="max-h-[85vh] max-w-full select-none object-contain"
                draggable={false}
                priority
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom indicator dots */}
      <motion.div
        className="relative z-10 flex items-center justify-center gap-1.5 pb-4 pt-2"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.3 }}
      >
        {images.length <= 20 &&
          images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onGoto(i);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-6 bg-white" : "w-1.5 bg-white/30 hover:bg-white/50"
              }`}
              aria-label={`查看第 ${i + 1} 张图片`}
            />
          ))}
      </motion.div>

      {/* Click background to close */}
      <div className="absolute inset-0 z-0" onClick={onClose} />
    </motion.div>
  );
}
