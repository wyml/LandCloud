import Link from "next/link";
import Image from "next/image";

import { AlbumGrid } from "@/components/site/album-grid";
import { PhotoGrid } from "@/components/site/photo-grid";
import { SectionReveal } from "@/components/site/section-reveal";
import { listPublicAlbums, listPublicTags, listRecentPublicImages } from "@/server/queries/public";
import { getSiteSettings } from "@/server/queries/settings";
import { Tag, Images, Camera } from "lucide-react";

export default async function HomePage() {
  const settings = await getSiteSettings();
  const albums = await listPublicAlbums();
  const tags = await listPublicTags();
  const recent = await listRecentPublicImages(24);

  const heroImage = recent.length > 0 ? recent[0] : null;

  return (
    <div className="flex flex-col gap-12">
      {/* Hero Section */}
      <section className="relative -mx-4 -mt-6 overflow-hidden px-4 py-0">
        <div className="relative h-[40vh] min-h-[320px] max-h-[480px] overflow-hidden rounded-2xl">
          {heroImage ? (
            <Image
              src={heroImage.id}
              alt=""
              fill
              sizes="100vw"
              quality={80}
              className="scale-110 object-cover blur-[2px]"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-200 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900" />
          )}
          <div className="hero-overlay absolute inset-0" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-lg md:text-5xl">
              {settings.name}
            </h1>
            {settings.description && (
              <p className="mt-4 max-w-lg text-base text-white/80 drop-shadow-sm md:text-lg">
                {settings.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Tags */}
      {tags.length > 0 && (
        <SectionReveal>
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Tag className="h-5 w-5 text-[var(--accent)]" />
              热门标签
            </h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, i) => (
                <Link
                  key={tag.id}
                  href={`/tags/${encodeURIComponent(tag.name)}`}
                  className="rounded-full border border-neutral-200 px-3.5 py-1.5 text-sm opacity-80 transition-all duration-200 hover:scale-105 hover:bg-neutral-100 hover:opacity-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {tag.name}
                  <span className="ml-1 text-xs opacity-50">{tag.count}</span>
                </Link>
              ))}
            </div>
          </section>
        </SectionReveal>
      )}

      {/* Albums */}
      {albums.length > 0 && (
        <SectionReveal>
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Images className="h-5 w-5 text-[var(--accent)]" />
              相册
            </h2>
            <AlbumGrid albums={albums} />
          </section>
        </SectionReveal>
      )}

      {/* Recent Photos */}
      <SectionReveal>
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Camera className="h-5 w-5 text-[var(--accent)]" />
            最新图片
          </h2>
          <PhotoGrid images={recent} />
        </section>
      </SectionReveal>
    </div>
  );
}
