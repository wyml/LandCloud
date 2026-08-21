/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ViewTracker } from "@/components/site/view-tracker";
import { LivePhotoPlayer } from "@/components/site/live-photo-player";
import { getNeighborImageIds, getPublicImage } from "@/server/queries/public";
import { getExternalLinkSettings } from "@/server/queries/settings";
import { getS3PublicBase, getSiteUrl } from "@/lib/env";
import { ExternalLinks } from "@/components/admin/images/external-links";
import { BlurImage } from "@/components/shared/blur-image";

export async function generateMetadata({ params }: PageProps<"/images/[id]">): Promise<Metadata> {
  const { id } = await params;
  const image = await getPublicImage(id);
  if (!image) return {};
  return {
    title: image.title || image.original_name,
    description: image.description || undefined,
    openGraph: {
      title: image.title || image.original_name,
      description: image.description || undefined,
      type: "website",
      images: [`/f/${image.id}/display`],
    },
  };
}

function formatExifValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value);
}

export default async function ImageDetailPage({ params }: PageProps<"/images/[id]">) {
  const { id } = await params;
  const image = await getPublicImage(id);
  if (!image) notFound();

  const externalLink = await getExternalLinkSettings();
  const siteUrl = getSiteUrl();
  const publicBase = externalLink.directBase || getS3PublicBase();

  const { prevId, nextId } = await getNeighborImageIds(id, image.taken_at);

  const exif = image.exif as Record<string, unknown>;
  const exposure = typeof exif.exposureTime === "number" ? exif.exposureTime : null;
  const exifFields: Array<[string, unknown]> = [
    ["拍摄时间", image.taken_at ? new Date(image.taken_at).toLocaleString("zh-CN") : null],
    ["相机品牌", exif.make],
    ["相机型号", exif.model],
    ["镜头", exif.lensModel],
    ["光圈", typeof exif.fNumber === "number" ? `f/${exif.fNumber}` : null],
    ["快门", exposure ? `1/${Math.round(1 / exposure)}` : null],
    ["焦距", typeof exif.focalLength === "number" ? `${exif.focalLength}mm` : null],
    ["ISO", exif.iso],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="truncate text-xl font-semibold">{image.title || image.original_name}</h1>
        <div className="flex shrink-0 gap-2 text-sm">
          {prevId ? (
            <a
              href={`/images/${prevId}`}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
            >
              ← 上一张
            </a>
          ) : null}
          {nextId ? (
            <a
              href={`/images/${nextId}`}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
            >
              下一张 →
            </a>
          ) : null}
        </div>
      </div>

      <ViewTracker type="image" id={id} />

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1 overflow-hidden rounded-xl bg-neutral-100">
          {image.is_live_photo && image.live_photo_video_key ? (
            <LivePhotoPlayer imageId={id} />
          ) : (
            <BlurImage
              src={`/f/${id}/display`}
              alt={image.title || image.original_name}
              className="h-auto w-full"
            />
          )}
          <div className="flex items-center gap-4 border-t border-neutral-200 p-3 text-sm dark:border-neutral-800">
            <a
              href={`/f/${id}/original`}
              target="_blank"
              rel="noreferrer"
              className="opacity-70 hover:underline"
            >
              查看原图
            </a>
            <span className="opacity-50">
              {image.width}×{image.height} · {image.view_count} 次浏览
            </span>
          </div>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-72">
          {image.description && (
            <p className="rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
              {image.description}
            </p>
          )}

          <ExternalLinks
            image={{ ...image, visibility: "public" }}
            siteUrl={siteUrl}
            s3PublicBase={publicBase}
            preferDirect={externalLink.defaultType === "direct"}
          />

          {image.tags.length > 0 && (
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <h3 className="mb-2 text-sm font-semibold">标签</h3>
              <div className="flex flex-wrap gap-1.5">
                {image.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/tags/${encodeURIComponent(tag.name)}`}
                    className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs dark:bg-neutral-800"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {image.albums.length > 0 && (
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <h3 className="mb-2 text-sm font-semibold">所属相册</h3>
              <div className="flex flex-col gap-1">
                {image.albums.map((album) => (
                  <Link
                    key={album.id}
                    href={`/albums/${album.id}`}
                    className="text-sm opacity-70 hover:underline"
                  >
                    {album.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
            <h3 className="mb-2 text-sm font-semibold">EXIF 信息</h3>
            <dl className="flex flex-col gap-1.5 text-sm">
              {exifFields.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt className="opacity-50">{label}</dt>
                  <dd className="truncate">{formatExifValue(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
