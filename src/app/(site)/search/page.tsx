import type { Metadata } from "next";

import { AlbumGrid } from "@/components/site/album-grid";
import { PhotoGrid } from "@/components/site/photo-grid";
import { searchPublic } from "@/server/queries/public";

export const metadata: Metadata = { title: "搜索" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const result = q ? await searchPublic(q) : { images: [], albums: [] };

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">搜索</h1>
      <form action="/search" method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="搜索标题 / 描述 / 文件名 / 标签 / 年份"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          搜索
        </button>
      </form>

      {q && (
        <>
          <section>
            <h2 className="mb-3 text-lg font-semibold">图片结果（{result.images.length}）</h2>
            <PhotoGrid images={result.images} />
          </section>
          <section>
            <h2 className="mb-3 text-lg font-semibold">相册结果（{result.albums.length}）</h2>
            <AlbumGrid albums={result.albums} />
          </section>
          {result.images.length === 0 && result.albums.length === 0 && (
            <p className="py-8 text-center opacity-60">未找到相关内容</p>
          )}
        </>
      )}
    </div>
  );
}
