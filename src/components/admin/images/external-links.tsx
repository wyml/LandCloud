"use client";

import { useMemo, useState } from "react";
import { Button, Input, Surface } from "@heroui/react";
import { Check } from "lucide-react";
import type { ImageRow } from "@/lib/types";
import { buildImageUrls, formatLink, getVariantLabel, variantOrder } from "@/lib/images/urls";
import { AppSelect } from "@/components/shared/app-select";
import { AlertDialog, useAlertDialog } from "@/components/shared/alert-dialog";

type ExternalLinkImage = Pick<ImageRow, "id" | "s3_key" | "mime" | "title" | "visibility">;

interface ExternalLinksProps {
  image: ExternalLinkImage;
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
  const { dialog, showAlert, closeDialog } = useAlertDialog();

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
      showAlert("复制失败", "无法复制到剪贴板，请手动复制");
    }
  }

  const selectedEntry = entries.find((e) => e.variant === selectedVariant);
  const selectedUrl = selectedEntry?.url ?? "";
  const formatted = selectedUrl ? formatLink(selectedUrl, format, image.title) : "";

  return (
    <Surface variant="secondary" className="flex flex-col gap-2 rounded-lg p-3 text-sm">
      <p className="font-medium">图片外链</p>

      <div className="flex flex-wrap items-center gap-2">
        <AppSelect
          value={selectedVariant}
          onChange={setSelectedVariant}
          options={entries.map((e) => ({ value: e.variant, label: e.label }))}
          ariaLabel="选择变体"
        />
        <AppSelect
          value={format}
          onChange={(v) => setFormat(v as typeof format)}
          options={[
            { value: "url", label: "URL" },
            { value: "markdown", label: "Markdown" },
            { value: "html", label: "HTML" },
            { value: "bbcode", label: "BBCode" },
          ]}
          ariaLabel="选择格式"
        />
        <Button size="sm" onPress={() => copy(formatted, `current-${format}`)} variant="primary">
          {copied === `current-${format}` ? <Check className="h-4 w-4" /> : "复制"}
        </Button>
      </div>

      <Input readOnly value={formatted} aria-label="格式化链接" />

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
        <ul className="mt-2 flex flex-col gap-2">
          {entries.map((e) => (
            <li key={e.variant} className="flex flex-col gap-1">
              <span>{e.label}</span>
              <div className="flex gap-1">
                <Input readOnly value={e.url ?? ""} className="flex-1" aria-label={e.label} />
                <Button size="sm" onPress={() => copy(e.url ?? "", e.variant)}>
                  {copied === e.variant ? <Check className="h-4 w-4" /> : "复制"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </details>

      <AlertDialog
        open={dialog.open}
        onClose={closeDialog}
        title={dialog.title}
        message={dialog.message}
      />
    </Surface>
  );
}
