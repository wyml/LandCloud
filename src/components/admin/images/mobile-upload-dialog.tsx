/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { createMobileUploadToken } from "@/server/actions/mobile-upload";

interface MobileUploadToken {
  url: string;
  expiresAt: number;
  qrDataUrl: string;
}

export function MobileUploadDialog() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<MobileUploadToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  async function refresh() {
    setError(null);
    setCopied(false);
    try {
      setData(await createMobileUploadToken());
    } catch (e) {
      setError((e as Error).message ?? "生成失败，请确认已登录");
    }
  }

  async function openDialog() {
    setOpen(true);
    await refresh();
  }

  async function copyUrl() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.url);
      setCopied(true);
    } catch {
      setError("复制失败，请手动复制链接");
    }
  }

  const secondsLeft = data ? Math.max(0, Math.round((data.expiresAt - now) / 1000)) : null;

  if (!open) {
    return (
      <Button variant="ghost" onPress={openDialog}>
        手机上传
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">手机上传</h2>
          <Button variant="ghost" size="sm" onPress={() => setOpen(false)}>
            关闭
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {data && (
          <>
            <div className="flex flex-col items-center gap-2">
              <img
                src={data.qrDataUrl}
                alt="手机上传二维码"
                className="h-56 w-56 rounded-lg border border-neutral-200 dark:border-neutral-800"
              />
              <p className="text-center text-sm opacity-70">
                用手机扫码后即可免登录上传，有效期{" "}
                <span className={secondsLeft !== null && secondsLeft <= 30 ? "text-red-600" : ""}>
                  {secondsLeft}s
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                readOnly
                value={data.url}
                onFocus={(e) => e.target.select()}
                className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-700"
              />
              <Button variant="ghost" size="sm" onPress={copyUrl}>
                {copied ? "已复制" : "复制"}
              </Button>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onPress={refresh}>
            刷新二维码
          </Button>
        </div>
      </div>
    </div>
  );
}
