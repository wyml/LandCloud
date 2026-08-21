/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ViewTracker } from "@/components/site/view-tracker";
import { LivePhotoPlayer } from "@/components/site/live-photo-player";
import { ImageDetailReveal } from "@/components/site/image-detail-reveal";
import { getNeighborImageIds, getPublicImage } from "@/server/queries/public";
import { getExternalLinkSettings } from "@/server/queries/settings";
import { getS3PublicBase, getSiteUrl } from "@/lib/env";
import { ExternalLinks } from "@/components/admin/images/external-links";
import { BlurImage } from "@/components/shared/blur-image";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Calendar,
  Camera,
  Aperture,
  Gauge,
  Timer,
  Focus,
  Tag,
  FolderOpen,
} from "lucide-react";

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

interface ExifField {
  label: string;
  value: unknown;
  icon: React.ElementType;
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
  const exifFields: ExifField[] = [
    { label: "拍摄时间", value: image.taken_at ? new Date(image.taken_at).toLocaleString("zh-CN") : null, icon: Calendar },
    { label: "相机品牌", value: exif.make, icon: Camera },
    { label: "相机型号", value: exif.model, icon: Camera },
    { label: "镜头", value: exif.lensModel, icon: Focus },
    { label: "光圈", value: typeof exif.fNumber === "number" ? `f/${exif.fNumber}` : null, icon: Aperture },
    { label: "快门", value: exposure ? `1/${Math.round(1 / exposure)}` : null, icon: Timer },
    { label: "焦距", value: typeof exif.focalLength === "number" ? `${exif.focalLength}mm` : null, icon: Focus },
    { label: "ISO", value: exif.iso, icon: Gauge },
  ];

  return (
    <ImageDetailReveal>
      <div className="flex flex-col gap-6">
        {/* Header with nav */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/albums"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800"
              aria-label="返回"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="truncate text-xl font-semibold">{image.title || image.original_name}</h1>
          </div>
          <div className="flex shrink-0 gap-1.5">
            {prevId ? (
              <a
                href={`/images/${prevId}`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800"
                aria-label="上一张"
              >
                <ChevronLeft className="h-4 w-4" />
              </a>
            ) : null}
            {nextId ? (
              <a
                href={`/images/${nextId}`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800"
                aria-label="下一张"
              >
                <ChevronRight className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>

        <ViewTracker type="image" id={id} />

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Image area */}
          <div className="min-w-0 flex-1 overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900">
            {image.is_live_photo && image.live_photo_video_key ? (
              <LivePhotoPlayer imageId={id} />
            ) : (
              <BlurImage
                src={`/f/${id}/display`}
                alt={image.title || image.original_name}
                className="h-auto w-full"
              />
            )}
            <div className="flex items-center gap-4 border-t border-neutral-200 px-4 py-3 text-sm dark:border-neutral-800">
              <a
                href={`/f/${id}/original`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                <Download className="h-3.5 w-3.5" />
                查看原图
              </a>
              <span className="flex items-center gap-1.5 text-neutral-400">
                <Eye className="h-3.5 w-3.5" />
                {image.width}×{image.height} · {image.view_count} 次浏览
              </span>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-72">
            {image.description && (
              <p className="rounded-2xl border border-neutral-200 p-4 text-sm leading-relaxed dark:border-neutral-800">
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
              <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
                <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold">
                  <Tag className="h-3.5 w-3.5 text-[var(--accent)]" />
                  标签
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {image.tags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/tags/${encodeURIComponent(tag.name)}`}
                      className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                    >
                      {tag.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {image.albums.length > 0 && (
              <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
                <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold">
                  <FolderOpen className="h-3.5 w-3.5 text-[var(--accent)]" />
                  所属相册
                </h3>
                <div className="flex flex-col gap-1.5">
                  {image.albums.map((album) => (
                    <Link
                      key={album.id}
                      href={`/albums/${album.id}`}
                      className="text-sm opacity-70 transition-opacity hover:opacity-100 hover:underline"
                    >
                      {album.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Camera className="h-3.5 w-3.5 text-[var(--accent)]" />
                EXIF 信息
              </h3>
              <dl className="flex flex-col gap-2 text-sm">
                {exifFields.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <dt className="flex items-center gap-1.5 text-neutral-400">
                      <Icon className="h-3 w-3" />
                      {label}
                    </dt>
                    <dd className="truncate font-medium">{formatExifValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </ImageDetailReveal>
  );
}
