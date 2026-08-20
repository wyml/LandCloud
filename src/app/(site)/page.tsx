import Link from "next/link";

import { AlbumGrid } from "@/components/site/album-grid";
import { PhotoGrid } from "@/components/site/photo-grid";
import { listPublicAlbums, listPublicTags, listRecentPublicImages } from "@/server/queries/public";
import { getSiteSettings } from "@/server/queries/settings";

export default async function HomePage() {
  const settings = await getSiteSettings();
  const albums = await listPublicAlbums();
  const tags = await listPublicTags();
  const recent = await listRecentPublicImages(24);

  return (
    <div className="flex flex-col gap-10">
      <section className="py-10 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">{settings.name}</h1>
        {settings.description && <p className="mt-3 opacity-70">{settings.description}</p>}
      </section>

      {tags.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">热门标签</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tags/${encodeURIComponent(tag.name)}`}
                className="rounded-full border border-neutral-200 px-3 py-1 text-sm opacity-80 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
              >
                {tag.name}
                <span className="ml-1 text-xs opacity-50">{tag.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {albums.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">相册</h2>
          <AlbumGrid albums={albums} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">最新图片</h2>
        <PhotoGrid images={recent} />
      </section>
    </div>
  );
}
