import type { Metadata } from "next";
import Link from "next/link";

import { listPublicTags } from "@/server/queries/public";

export const metadata: Metadata = { title: "标签" };

export default async function TagsPage() {
  const tags = await listPublicTags();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">标签</h1>
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
        {tags.length === 0 && <p className="py-10 text-center opacity-60">暂无标签</p>}
      </div>
    </div>
  );
}
