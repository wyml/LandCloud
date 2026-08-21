"use client";

import { Play, Pause } from "lucide-react";
import { useRef, useState } from "react";

interface LivePhotoPlayerProps {
  imageId: string;
}

export function LivePhotoPlayer({ imageId }: LivePhotoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  function togglePlay() {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        src={`/f/video/${imageId}`}
        className="w-full rounded-xl"
        loop
        muted
        playsInline
        onEnded={() => setIsPlaying(false)}
      />
      <button
        onClick={togglePlay}
        className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80"
        aria-label={isPlaying ? "暂停" : "播放"}
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </button>
      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
        </span>
        实况照片
      </div>
    </div>
  );
}
