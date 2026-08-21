import type { Metadata } from "next";
import Link from "next/link";

import { SectionReveal } from "@/components/site/section-reveal";
import { listPublicTags } from "@/server/queries/public";
import { Tag } from "lucide-react";

export const metadata: Metadata = { title: "标签" };

export default async function TagsPage() {
  const tags = await listPublicTags();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="flex items-center gap-2.5 text-2xl font-semibold">
        <Tag className="h-6 w-6 text-[var(--accent)]" />
        标签
      </h1>
      <SectionReveal>
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
          {tags.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 opacity-40">
              <Tag className="h-10 w-10" />
              <p className="text-sm">暂无标签</p>
            </div>
          )}
        </div>
      </SectionReveal>
    </div>
  );
}
