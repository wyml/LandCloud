"use client";

import { useMemo, useState } from "react";
import { Button } from "@heroui/react";
import type { ImageWithRelations } from "@/lib/types";
import { buildImageUrls, formatLink, getVariantLabel, variantOrder } from "@/lib/images/urls";

interface ExternalLinksProps {
  image: ImageWithRelations;
  siteUrl: string;
  s3PublicBase: string | null;
  preferDirect?: boolean;
}

export function ExternalLinks({
  image,
  siteUrl,
  s3PublicBase,
  preferDirect = false,
}: ExternalLinksProps) {
  const [format, setFormat] = useState<"url" | "markdown" | "html" | "bbcode">("url");
  const [selectedVariant, setSelectedVariant] = useState("original");
  const [copied, setCopied] = useState<string | null>(null);

  const urls = useMemo(
    () => buildImageUrls(image, s3PublicBase, siteUrl),
    [image, s3PublicBase, siteUrl],
  );

  const entries = useMemo(() => {
    const items: Array<{ variant: string; label: string; url: string | null }> = [];
    for (const v of variantOrder()) {
      const entry = urls[v.key];
      if (!entry) continue;
      items.push({
        variant: v.proxyVariant,
        label: getVariantLabel(v.key),
        url: preferDirect ? (entry.direct ?? entry.proxy) : entry.proxy,
      });
    }
    return items;
  }, [urls, preferDirect]);

  async function copy(text: string, tag: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      window.alert("复制失败");
    }
  }

  const selectedEntry = entries.find((e) => e.variant === selectedVariant);
  const selectedUrl = selectedEntry?.url ?? "";
  const formatted = selectedUrl ? formatLink(selectedUrl, format, image.title) : "";

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-900">
      <p className="font-medium">图片外链</p>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedVariant}
          onChange={(e) => setSelectedVariant(e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
        >
          {entries.map((e) => (
            <option key={e.variant} value={e.variant}>
              {e.label}
            </option>
          ))}
        </select>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as typeof format)}
          className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="url">URL</option>
          <option value="markdown">Markdown</option>
          <option value="html">HTML</option>
          <option value="bbcode">BBCode</option>
        </select>
        <Button size="sm" onPress={() => copy(formatted, `current-${format}`)} variant="primary">
          {copied === `current-${format}` ? "已复制 ✓" : "复制"}
        </Button>
      </div>

      <input
        readOnly
        value={formatted}
        className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-950"
      />

      {image.visibility === "public" && s3PublicBase ? (
        <p className="text-xs opacity-60">直链与代理链接均可使用。</p>
      ) : (
        <p className="text-xs opacity-60">
          {image.visibility === "public"
            ? "未配置 S3 公网域名，仅提供代理链接（/f/ 路由）。"
            : "非公开图片仅提供代理链接（需登录访问）。"}
        </p>
      )}

      <details className="text-xs opacity-80">
        <summary className="cursor-pointer">查看全部变体链接</summary>
        <ul className="mt-2 flex flex-col gap-1">
          {entries.map((e) => (
            <li key={e.variant} className="flex flex-col gap-1">
              <span>{e.label}</span>
              <div className="flex gap-1">
                <input
                  readOnly
                  value={e.url ?? ""}
                  className="flex-1 rounded border border-neutral-300 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-950"
                />
                <Button size="sm" onPress={() => copy(e.url ?? "", e.variant)}>
                  {copied === e.variant ? "✓" : "复制"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
