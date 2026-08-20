import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PhotoGrid } from "@/components/site/photo-grid";
import { listImagesByTag } from "@/server/queries/public";

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
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">
        标签：{name}
        <span className="ml-2 text-sm font-normal opacity-50">{images.length} 张</span>
      </h1>
      <PhotoGrid images={images} />
    </div>
  );
}
