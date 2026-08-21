import type { Metadata } from "next";

import { AlbumGrid } from "@/components/site/album-grid";
import { PhotoGrid } from "@/components/site/photo-grid";
import { SectionReveal } from "@/components/site/section-reveal";
import { searchPublic } from "@/server/queries/public";
import { Search } from "lucide-react";

export const metadata: Metadata = { title: "搜索" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const result = q ? await searchPublic(q) : { images: [], albums: [] };

  return (
    <div className="flex flex-col gap-8">
      <h1 className="flex items-center gap-2.5 text-2xl font-semibold">
        <Search className="h-6 w-6 text-[var(--accent)]" />
        搜索
      </h1>

      <form action="/search" method="get" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="搜索标题 / 描述 / 文件名 / 标签 / 年份"
            className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm transition-colors placeholder:text-neutral-400 focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] dark:border-neutral-800 dark:bg-neutral-900"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          搜索
        </button>
      </form>

      {q && (
        <SectionReveal>
          <>
            <section>
              <h2 className="mb-3 text-lg font-semibold">
                图片结果
                <span className="ml-2 text-sm font-normal opacity-50">({result.images.length})</span>
              </h2>
              <PhotoGrid images={result.images} />
            </section>
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">
                相册结果
                <span className="ml-2 text-sm font-normal opacity-50">({result.albums.length})</span>
              </h2>
              <AlbumGrid albums={result.albums} />
            </section>
            {result.images.length === 0 && result.albums.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 opacity-40">
                <Search className="h-10 w-10" />
                <p className="text-sm">未找到相关内容</p>
              </div>
            )}
          </>
        </SectionReveal>
      )}
    </div>
  );
}
