import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PhotoGrid } from "@/components/site/photo-grid";
import { SectionReveal } from "@/components/site/section-reveal";
import { listImagesByTag } from "@/server/queries/public";
import { Tag } from "lucide-react";

export async function generateMetadata({ params }: PageProps<"/tags/[name]">): Promise<Metadata> {
  const { name } = await params;
  const images = await listImagesByTag(decodeURIComponent(name), 1);
  if (images.length === 0) return { title: decodeURIComponent(name) };
  return { title: decodeURIComponent(name) };
}

export default async function TagDetailPage({ params }: PageProps<"/tags/[name]">) {
  const name = decodeURIComponent((await params).name);
  const images = await listImagesByTag(name);
  if (images.length === 0) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="flex items-center gap-2.5 text-2xl font-semibold">
        <Tag className="h-6 w-6 text-[var(--accent)]" />
        {name}
        <span className="ml-1 text-sm font-normal opacity-50">{images.length} 张</span>
      </h1>
      <SectionReveal>
        <PhotoGrid images={images} />
      </SectionReveal>
    </div>
  );
}
