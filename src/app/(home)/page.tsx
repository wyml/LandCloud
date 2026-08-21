import Link from "next/link";

import { AlbumGrid } from "@/components/site/album-grid";
import { GlobeHome } from "@/components/site/globe-home";
import { HomeHero } from "@/components/site/home-hero";
import { PhotoGrid } from "@/components/site/photo-grid";
import { SectionReveal } from "@/components/site/section-reveal";
import {
  listPublicAlbums,
  listPublicTags,
  listRandomPublicImages,
  listRecentPublicImages,
} from "@/server/queries/public";
import { getSiteSettings } from "@/server/queries/settings";
import { getSessionUser, isAdminUser } from "@/lib/auth";
import { Tag, Images, Camera } from "lucide-react";

export default async function HomePage() {
  const settings = await getSiteSettings();
  const user = await getSessionUser();
  const isAdmin = await isAdminUser(user);
  const isPrivate = settings.privateMode && !isAdmin;

  if (settings.homepageTemplate === "globe") {
    const recent = await listRecentPublicImages(9);
    return <GlobeHome settings={settings} recentPhotos={recent} />;
  }

  const heroImage = await listRandomPublicImages();

  if (isPrivate) {
    return (
      <div className="flex flex-col">
        <HomeHero settings={settings} image={heroImage} />
      </div>
    );
  }

  const albums = await listPublicAlbums();
  const tags = await listPublicTags();
  const recent = await listRecentPublicImages(24);

  return (
    <div className="flex flex-col">
      {/* Full-screen immersive Hero */}
      <HomeHero settings={settings} image={heroImage} />

      {/* Second screen */}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-12">
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
    </div>
  );
}
