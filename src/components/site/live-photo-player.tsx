"use client";

import { Aperture, Play, Pause } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseLivePhoto } from "@/lib/images/live-photo-parser";

interface LivePhotoPlayerProps {
  imageId?: string;
  file?: File;
  imageFile?: File;
  videoFile?: File;
  className?: string;
  showBadge?: boolean;
}

export function LivePhotoPlayer({
  imageId,
  file,
  imageFile,
  videoFile,
  className = "",
  showBadge = true,
}: LivePhotoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  useEffect(() => {
    const revoked: string[] = [];

    async function loadLocal() {
      if (imageFile && videoFile) {
        const img = URL.createObjectURL(imageFile);
        const vid = URL.createObjectURL(videoFile);
        revoked.push(img, vid);
        setImageUrl(img);
        setVideoUrl(vid);
        return;
      }

      if (file) {
        setLoading(true);
        try {
          const result = await parseLivePhoto(file);
          const img = URL.createObjectURL(result.imageBlob);
          revoked.push(img);
          setImageUrl(img);
          if (result.videoBlob) {
            const vid = URL.createObjectURL(result.videoBlob);
            revoked.push(vid);
            setVideoUrl(vid);
          }
        } finally {
          setLoading(false);
        }
      }
    }

    loadLocal();

    return () => {
      revoked.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [file, imageFile, videoFile]);

  const resolvedImageSrc = imageUrl || (imageId ? `/f/${imageId}/display` : null);
  const resolvedVideoSrc = videoUrl || (imageId ? `/f/video/${imageId}` : null);

  const play = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  function handleMouseDown() {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      play();
    }, 500);
  }

  function handleMouseUp() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isLongPress.current) {
      pause();
      isLongPress.current = false;
    }
  }

  function handleMouseLeave() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isPlaying && !isLongPress.current) {
      pause();
    }
  }

  if (loading) {
    return (
      <div className={`relative flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 ${className}`}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
      </div>
    );
  }

  if (!resolvedImageSrc) return null;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onClick={toggle}
      onMouseEnter={() => resolvedVideoSrc && play()}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
    >
      <img
        src={resolvedImageSrc}
        alt=""
        className="h-full w-full object-cover"
        draggable={false}
      />

      {resolvedVideoSrc && (
        <video
          ref={videoRef}
          src={resolvedVideoSrc}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            isPlaying ? "opacity-100" : "opacity-0"
          }`}
          loop
          muted
          playsInline
          preload="auto"
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {resolvedVideoSrc && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80"
          aria-label={isPlaying ? "暂停" : "播放"}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
      )}

      {showBadge && resolvedVideoSrc && (
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur">
          <Aperture className="h-3.5 w-3.5" />
          实况照片
        </div>
      )}
    </div>
  );
}
