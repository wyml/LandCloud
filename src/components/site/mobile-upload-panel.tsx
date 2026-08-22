"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X, LoaderCircle, Clock, Copy } from "lucide-react";
import {
  ACCEPTED_MIME,
  MAX_BATCH_SIZE,
  MAX_FILE_SIZE,
  isAcceptedMime,
} from "@/lib/images/variants";
import { AlertDialog, useAlertDialog } from "@/components/shared/alert-dialog";

const CONCURRENCY = 3;
const RENEW_THRESHOLD_MS = 60_000;

type FileState =
  | { state: "waiting" | "signing" | "completing"; pct: number }
  | { state: "uploading"; pct: number }
  | { state: "done" | "failed" | "duplicate"; pct: number; error?: string };

function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`上传失败 (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("网络错误"));
    xhr.send(file);
  });
}

export function MobileUploadPanel({
  token: initialToken,
  expiresAt: initialExpiresAt,
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
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const allUrlsRef = useRef<Set<string>>(new Set());
  const { dialog, showAlert, closeDialog } = useAlertDialog();

  const tokenRef = useRef(initialToken);
  const expiresAtRef = useRef(initialExpiresAt);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const urls = allUrlsRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  const secondsLeft = expiresAt ? Math.max(0, Math.round((expiresAt - now) / 1000)) : null;
  const expired = secondsLeft !== null && secondsLeft <= 0;

  const setStatus = useCallback((key: string, s: FileState) => {
    setStatuses((prev) => ({ ...prev, [key]: s }));
  }, []);

  function keyOf(f: File) {
    return f.name + ":" + f.size;
  }

  async function renewToken(): Promise<boolean> {
    try {
      const res = await fetch("/api/upload/renew-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenRef.current }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { token: string; expiresAt: number };
      tokenRef.current = data.token;
      expiresAtRef.current = data.expiresAt;
      setExpiresAt(data.expiresAt);
      return true;
    } catch {
      return false;
    }
  }

  async function ensureTokenValid(): Promise<boolean> {
    if (!expiresAtRef.current) return true;
    const remaining = expiresAtRef.current - Date.now();
    if (remaining > RENEW_THRESHOLD_MS) return true;
    return renewToken();
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
    const newUrls: Record<string, string> = {};
    for (const f of valid) {
      if (f.type.startsWith("image/")) {
        const url = URL.createObjectURL(f);
        newUrls[keyOf(f)] = url;
        allUrlsRef.current.add(url);
      }
    }
    if (Object.keys(newUrls).length > 0) {
      setThumbUrls((prev) => ({ ...prev, ...newUrls }));
    }
  }

  function removeFile(key: string) {
    setFiles((prev) => prev.filter((f) => keyOf(f) !== key));
    setStatuses((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setThumbUrls((prev) => {
      if (prev[key]) {
        URL.revokeObjectURL(prev[key]);
        allUrlsRef.current.delete(prev[key]);
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return prev;
    });
  }

  function clearAll() {
    for (const url of allUrlsRef.current) URL.revokeObjectURL(url);
    allUrlsRef.current.clear();
    setFiles([]);
    setStatuses({});
    setThumbUrls({});
  }

  async function startUpload() {
    if (files.length === 0 || busy || expired) return;
    setBusy(true);

    const headers = () => ({
      "Content-Type": "application/json",
      "x-upload-token": tokenRef.current,
    });

    try {
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: headers(),
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

      let nextIndex = 0;

      async function worker() {
        while (nextIndex < files.length) {
          const i = nextIndex++;
          const file = files[i];
          const sig = signed[i];
          const key = keyOf(file);
          if (!sig) {
            setStatus(key, { state: "failed", pct: 0, error: "未获取到签名" });
            continue;
          }
          try {
            const tokenOk = await ensureTokenValid();
            if (!tokenOk) {
              setStatus(key, { state: "failed", pct: 0, error: "token续期失败" });
              continue;
            }

            setStatus(key, { state: "uploading", pct: 5 });
            await uploadWithProgress(sig.url, file, (pct) => {
              setStatus(key, { state: "uploading", pct: Math.max(5, pct) });
            });
            setStatus(key, { state: "completing", pct: 100 });

            const completeRes = await fetch("/api/upload/complete", {
              method: "POST",
              headers: headers(),
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
      }

      const workers = Array.from(
        { length: Math.min(CONCURRENCY, files.length) },
        () => worker(),
      );
      await Promise.all(workers);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">手机上传</h1>
        <div className="flex items-center gap-2">
          {secondsLeft !== null && (
            <span className={`text-sm tabular-nums ${expired ? "text-red-600" : "opacity-60"}`}>
              {expired ? "已过期" : `${secondsLeft}s`}
            </span>
          )}
        </div>
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
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
            : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
        }`}
      >
        <p className="text-base font-medium">点击选择图片</p>
        <p className="text-xs opacity-60">
          JPG / PNG / WebP / GIF / AVIF / SVG，单张 ≤50MB
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
        <>
          <div className="grid grid-cols-3 gap-2">
            {files.map((f) => {
              const key = keyOf(f);
              const status = statuses[key];
              const url = thumbUrls[key];
              const pct = status?.pct ?? 0;
              const blur =
                status?.state === "done" || status?.state === "duplicate"
                  ? 0
                  : status?.state === "uploading"
                    ? Math.max(0, 12 - (pct / 100) * 12)
                    : status?.state === "completing"
                      ? 2
                      : 12;

              return (
                <div
                  key={key}
                  className="group relative overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="aspect-square w-full overflow-hidden">
                    {url ? (
                      <img
                        src={url}
                        alt={f.name}
                        className="h-full w-full object-cover transition-[filter] duration-500 ease-out"
                        style={{ filter: `blur(${blur}px)` }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-2">
                        <p className="line-clamp-2 text-center text-[10px] opacity-40">{f.name}</p>
                      </div>
                    )}
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center">
                    {status?.state === "uploading" && (
                      <div className="flex flex-col items-center gap-0.5">
                        <LoaderCircle className="h-5 w-5 animate-spin text-white drop-shadow-lg" />
                        <span className="rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          {pct}%
                        </span>
                      </div>
                    )}
                    {status?.state === "completing" && (
                      <LoaderCircle className="h-5 w-5 animate-spin text-white drop-shadow-lg" />
                    )}
                    {status?.state === "done" && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/90 shadow-lg">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                    {status?.state === "duplicate" && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/90 shadow-lg">
                        <Copy className="h-4 w-4 text-white" />
                      </div>
                    )}
                    {status?.state === "failed" && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/90 shadow-lg">
                        <X className="h-4 w-4 text-white" />
                      </div>
                    )}
                    {status?.state === "waiting" && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
                        <Clock className="h-3 w-3 text-white/80" />
                      </div>
                    )}
                  </div>

                  {status?.state === "uploading" && (
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-neutral-200/50 dark:bg-neutral-800/50">
                      <div
                        className="h-full bg-blue-500 transition-[width] duration-200 ease-linear"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4">
                    <p className="truncate text-[10px] font-medium text-white drop-shadow-sm">
                      {f.name}
                    </p>
                  </div>

                  {status?.state === "waiting" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(key);
                      }}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-red-500 group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}

                  {status?.state === "failed" && status.error && (
                    <div className="absolute inset-x-0 top-1 flex justify-center">
                      <span className="max-w-[90%] truncate rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] text-white shadow-lg">
                        {status.error}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={startUpload}
              disabled={busy || expired}
              className="flex-1 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {busy ? "上传中…" : `开始上传 (${files.length})`}
            </button>
            {!busy && (
              <button
                type="button"
                onClick={clearAll}
                className="rounded-lg border border-neutral-300 px-3 py-2.5 text-sm dark:border-neutral-700"
              >
                清除
              </button>
            )}
          </div>
        </>
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
