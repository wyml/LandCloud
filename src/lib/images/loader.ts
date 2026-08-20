import type { ImageLoader } from "next/image";

const picBedLoader: ImageLoader = ({ src, width }) => {
  const variant =
    width <= 160 ? "thumb_sm" : width <= 480 ? "thumb_md" : width <= 800 ? "thumb_lg" : "display";
  return `/f/${encodeURIComponent(src)}/${variant}`;
};

export default picBedLoader;
