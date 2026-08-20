import Image from "next/image";
import Link from "next/link";

import type { PublicImage } from "@/lib/types";

function naturalSize(img: PublicImage) {
  const w = img.width && img.width > 0 ? img.width : 800;
  const h = img.height && img.height > 0 ? img.height : 600;
  return { width: w, height: h, ratio: w / h };
}

export function PhotoCard({ image }: { image: PublicImage }) {
  const { width, height } = naturalSize(image);
  return (
    <Link
      href={`/images/${image.id}`}
      className="group relative block overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900"
    >
      <Image
        src={image.id}
        alt={image.title || image.original_name}
        width={width}
        height={height}
        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        className="h-auto w-full transition-transform duration-300 group-hover:scale-[1.03]"
      />
      {image.title ? (
        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
          {image.title}
        </span>
      ) : null}
    </Link>
  );
}

export function PhotoGrid({ images }: { images: PublicImage[] }) {
  if (images.length === 0) {
    return <p className="col-span-full py-10 text-center opacity-60">暂无公开图片</p>;
  }
  return (
    <div className="columns-2 gap-3 md:columns-3 lg:columns-4 [&>*]:mb-3">
      {images.map((image) => (
        <div key={image.id} className="break-inside-avoid">
          <PhotoCard image={image} />
        </div>
      ))}
    </div>
  );
}
