"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACCEPTED_MIME,
  MAX_BATCH_SIZE,
  MAX_FILE_SIZE,
  isAcceptedMime,
} from "@/lib/images/variants";
import { AlertDialog, useAlertDialog } from "@/components/shared/alert-dialog";

type FileState =
  | { state: "waiting" | "signing" | "completing"; pct: number }
  | { state: "uploading"; pct: number }
  | { state: "done" | "failed" | "duplicate"; pct: number; error?: string };

function uploadWithProgress(url: string, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = () => {};
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`上传失败 (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("网络错误"));
    xhr.send(file);
  });
}

export function MobileUploadPanel({
  token,
  expiresAt,
}: {
  token: string;
  expiresAt: number | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [statuses, setStatuses] = useState<Record<string, FileState>>({});
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [dragOver, setDragOver] = useState(false);
  const { dialog, showAlert, closeDialog } = useAlertDialog();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const secondsLeft = expiresAt ? Math.max(0, Math.round((expiresAt - now) / 1000)) : null;
  const expired = secondsLeft !== null && secondsLeft <= 0;

  const setStatus = useCallback((key: string, s: FileState) => {
    setStatuses((prev) => ({ ...prev, [key]: s }));
  }, []);

  function keyOf(f: File) {
    return f.name + ":" + f.size;
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list);
    if (picked.length === 0) return;
    if (files.length + picked.length > MAX_BATCH_SIZE) {
      showAlert("上传限制", `单次最多上传 ${MAX_BATCH_SIZE} 个文件`);
      return;
    }
    const valid: File[] = [];
    for (const f of picked) {
      if (!isAcceptedMime(f.type)) {
        showAlert("文件类型错误", `不支持的文件类型: ${f.name} (${f.type})`);
        continue;
      }
      if (f.size <= 0 || f.size > MAX_FILE_SIZE) {
        showAlert("文件大小超限", `文件大小超出限制 (≤50MB): ${f.name}`);
        continue;
      }
      valid.push(f);
    }
    setFiles((prev) => [...prev, ...valid]);
    setStatuses((prev) => {
      const next = { ...prev };
      valid.forEach((f) => {
        next[keyOf(f)] = { state: "waiting", pct: 0 };
      });
      return next;
    });
  }

  function removeFile(key: string) {
    setFiles((prev) => prev.filter((f) => keyOf(f) !== key));
    setStatuses((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function startUpload() {
    if (files.length === 0 || busy || expired) return;
    setBusy(true);

    const headers = { "Content-Type": "application/json", "x-upload-token": token };

    try {
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers,
        body: JSON.stringify({
          files: files.map((f) => ({ name: f.name, mime: f.type, size: f.size })),
        }),
      });
      if (!presignRes.ok) {
        const body = await presignRes.json().catch(() => null);
        showAlert("预签名失败", body?.error ?? "预签名失败");
        return;
      }
      const { files: signed } = (await presignRes.json()) as {
        files: Array<{ name: string; key: string; url: string }>;
      };

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const sig = signed[i];
        const key = keyOf(file);
        if (!sig) {
          setStatus(key, { state: "failed", pct: 0, error: "未获取到签名" });
          continue;
        }
        try {
          setStatus(key, { state: "uploading", pct: 5 });
          await uploadWithProgress(sig.url, file);
          setStatus(key, { state: "completing", pct: 100 });

          const completeRes = await fetch("/api/upload/complete", {
            method: "POST",
            headers,
            body: JSON.stringify({
              key: sig.key,
              originalName: file.name,
              mime: file.type,
              size: file.size,
            }),
          });
          const result = (await completeRes.json().catch(() => null)) as {
            duplicate?: boolean;
            error?: string;
          } | null;
          if (!completeRes.ok) {
            setStatus(key, {
              state: "failed",
              pct: 100,
              error: result?.error ?? "回调失败",
            });
            continue;
          }
          setStatus(key, { state: result?.duplicate ? "duplicate" : "done", pct: 100 });
        } catch (error) {
          setStatus(key, {
            state: "failed",
            pct: 100,
            error: (error as Error).message,
          });
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">手机上传</h1>
        {secondsLeft !== null && (
          <span className={`text-sm tabular-nums ${expired ? "text-red-600" : "opacity-60"}`}>
            {expired ? "链接已过期" : `${secondsLeft}s 后过期`}
          </span>
        )}
      </div>

      {expired && (
        <p className="text-sm text-red-600">临时上传链接已过期，请在电脑端重新生成二维码。</p>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
            : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
        }`}
      >
        <p className="text-base font-medium">点击选择手机相册中的图片</p>
        <p className="text-sm opacity-60">
          支持 JPG / PNG / WebP / GIF / AVIF / SVG，单张 ≤50MB，批量 ≤{MAX_BATCH_SIZE} 张
        </p>
        <p className="text-sm opacity-60">
          支持自动识别 Google/三星动态照片，Apple 实况照片请同时选择图片和视频
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={Object.keys(ACCEPTED_MIME).join(",")}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5 text-sm">
          {files.map((f) => {
            const key = keyOf(f);
            const status = statuses[key];
            return (
              <li
                key={key}
                className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className="text-xs opacity-50">{(f.size / 1024 / 1024).toFixed(2)}MB</span>
                {status?.state === "uploading" && (
                  <div className="h-1.5 w-16 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
                    <div className="h-full bg-blue-500" style={{ width: `${status.pct}%` }} />
                  </div>
                )}
                <span className="text-xs">
                  {status?.state === "waiting" && "待上传"}
                  {status?.state === "signing" && "签名中…"}
                  {status?.state === "uploading" && `${status.pct}%`}
                  {status?.state === "completing" && "处理中…"}
                  {status?.state === "done" && "✅ 完成"}
                  {status?.state === "duplicate" && "⚠️ 已存在"}
                  {status?.state === "failed" && (
                    <span className="text-red-600">
                      失败{status.error ? `: ${status.error}` : ""}
                    </span>
                  )}
                </span>
                {status?.state === "waiting" && (
                  <button
                    type="button"
                    onClick={() => removeFile(key)}
                    className="text-xs opacity-50 hover:opacity-100"
                  >
                    移除
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {files.length > 0 && (
        <button
          type="button"
          onClick={startUpload}
          disabled={busy || expired}
          className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {busy ? "上传中…" : `开始上传 (${files.length})`}
        </button>
      )}

      <AlertDialog
        open={dialog.open}
        onClose={closeDialog}
        title={dialog.title}
        message={dialog.message}
      />
    </div>
  );
}
