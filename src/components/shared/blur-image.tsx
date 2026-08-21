"use client";

import { useState } from "react";

interface BlurImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
}

export function BlurImage({ src, alt, className = "", ...props }: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <img
      src={src}
      alt={alt}
      className={`${className} transition-all duration-500 ${
        loaded ? "blur-0 opacity-100" : "blur-lg opacity-50"
      }`}
      onLoad={() => setLoaded(true)}
      {...props}
    />
  );
}
