import type { ImageRow } from "@/lib/types";

export interface ImageVariantUrls {
  original: { ext: string; direct: string | null; proxy: string };
  display: { ext: string; direct: string | null; proxy: string } | null;
  thumbLg: { direct: string | null; proxy: string };
  thumbMd: { direct: string | null; proxy: string };
  thumbSm: { direct: string | null; proxy: string };
}

const VARIANT_ORDER: Array<{
  key: keyof ImageVariantUrls;
  proxyVariant: string;
}> = [
  { key: "original", proxyVariant: "original" },
  { key: "display", proxyVariant: "display" },
  { key: "thumbLg", proxyVariant: "thumb_lg" },
  { key: "thumbMd", proxyVariant: "thumb_md" },
  { key: "thumbSm", proxyVariant: "thumb_sm" },
];

export function getVariantLabel(key: keyof ImageVariantUrls): string {
  switch (key) {
    case "original":
      return "原图";
    case "display":
      return "展示版 (WebP)";
    case "thumbLg":
      return "大缩略图";
    case "thumbMd":
      return "中缩略图";
    case "thumbSm":
      return "小缩略图";
  }
}

export function buildImageUrls(
  image: ImageRow,
  s3PublicBase: string | null,
  siteUrl: string,
): ImageVariantUrls {
  const dir = image.s3_key.slice(0, image.s3_key.lastIndexOf("/") + 1);
  const originalExt = image.s3_key.split(".").pop() ?? "bin";
  const hasWebPDisplay = !["image/gif", "image/svg+xml"].includes(image.mime);

  const direct = (rel: string): string | null => (s3PublicBase ? `${s3PublicBase}/${rel}` : null);

  return {
    original: {
      ext: originalExt,
      direct: direct(`${dir}original.${originalExt}`),
      proxy: `${siteUrl}/f/${image.id}/original`,
    },
    display: hasWebPDisplay
      ? {
          ext: "webp",
          direct: direct(`${dir}display.webp`),
          proxy: `${siteUrl}/f/${image.id}/display`,
        }
      : null,
    thumbLg: {
      direct: direct(`${dir}thumb_lg.webp`),
      proxy: `${siteUrl}/f/${image.id}/thumb_lg`,
    },
    thumbMd: {
      direct: direct(`${dir}thumb_md.webp`),
      proxy: `${siteUrl}/f/${image.id}/thumb_md`,
    },
    thumbSm: {
      direct: direct(`${dir}thumb_sm.webp`),
      proxy: `${siteUrl}/f/${image.id}/thumb_sm`,
    },
  };
}

export function formatLink(
  url: string,
  format: "url" | "markdown" | "html" | "bbcode",
  title: string,
): string {
  switch (format) {
    case "markdown":
      return `![${title}](${url})`;
    case "html":
      return `<img src="${url}" alt="${title}" />`;
    case "bbcode":
      return `[img]${url}[/img]`;
    case "url":
    default:
      return url;
  }
}

export function variantOrder(): typeof VARIANT_ORDER {
  return VARIANT_ORDER;
}
