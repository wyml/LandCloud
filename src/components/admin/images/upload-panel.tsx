"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, CloseButton, Input } from "@heroui/react";
import { Check, X, LoaderCircle, Clock, Copy } from "lucide-react";
import type { AlbumOption } from "@/lib/types";
import {
  ACCEPTED_MIME,
  LIVE_PHOTO_MIME,
  MAX_BATCH_SIZE,
  MAX_FILE_SIZE,
  isAcceptedMime,
  isAcceptedLivePhotoMime,
} from "@/lib/images/variants";
import { AppSelect } from "@/components/shared/app-select";
import { AppMultiSelect } from "@/components/shared/app-multi-select";
import { AlertDialog, useAlertDialog } from "@/components/shared/alert-dialog";

type FileState =
  | { state: "waiting" | "signing" | "completing"; pct: number }
  | { state: "uploading"; pct: number }
  | { state: "done" | "failed" | "duplicate"; pct: number; error?: string };

interface UploadPanelProps {
  albums: AlbumOption[];
  onClose: () => void;
  onUploaded: () => void;
  defaultPublic?: boolean;
}

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

export function UploadPanel({ albums, onClose, onUploaded, defaultPublic = true }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [statuses, setStatuses] = useState<Record<string, FileState>>({});
  const [tagInput, setTagInput] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private" | "password">(defaultPublic ? "public" : "private");
  const { dialog, showAlert, closeDialog } = useAlertDialog();
  const [albumIds, setAlbumIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const allUrlsRef = useRef<Set<string>>(new Set());

  const setStatus = useCallback((key: string, s: FileState) => {
    setStatuses((prev) => ({ ...prev, [key]: s }));
  }, []);

  function clearAll() {
    for (const url of allUrlsRef.current) URL.revokeObjectURL(url);
    allUrlsRef.current.clear();
    setFiles([]);
    setVideoFile(null);
    setStatuses({});
    setThumbUrls({});
    setTagInput("");
    setAlbumIds(new Set());
  }

  useEffect(() => {
    const urls = allUrlsRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

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
      if (isAcceptedLivePhotoMime(f.type)) {
        setVideoFile(f);
        continue;
      }
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
        next[f.name + ":" + f.size] = { state: "waiting", pct: 0 };
      });
      return next;
    });
    const newUrls: Record<string, string> = {};
    for (const f of valid) {
      if (f.type.startsWith("image/")) {
        const url = URL.createObjectURL(f);
        newUrls[f.name + ":" + f.size] = url;
        allUrlsRef.current.add(url);
      }
    }
    if (Object.keys(newUrls).length > 0) {
      setThumbUrls((prev) => ({ ...prev, ...newUrls }));
    }
  }

  function addVideoFile(file: File | null) {
    if (file) {
      if (!isAcceptedLivePhotoMime(file.type)) {
        showAlert("文件类型错误", `不支持的视频类型: ${file.name} (${file.type})`);
        return;
      }
      if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
        showAlert("文件大小超限", `视频文件大小超出限制 (≤50MB): ${file.name}`);
        return;
      }
      setVideoFile(file);
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

  function keyOf(f: File) {
    return f.name + ":" + f.size;
  }

  async function startUpload() {
    if (files.length === 0 || busy) return;
    setBusy(true);

    try {
      const allFiles = [
        ...files.map((f) => ({ name: f.name, mime: f.type, size: f.size })),
        ...(videoFile ? [{ name: videoFile.name, mime: videoFile.type, size: videoFile.size }] : []),
      ];

      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: allFiles }),
      });
      if (!presignRes.ok) {
        const body = await presignRes.json().catch(() => null);
        showAlert("预签名失败", body?.error ?? "预签名失败");
        setBusy(false);
        return;
      }
      const { files: signed } = (await presignRes.json()) as {
        files: Array<{ name: string; key: string; url: string }>;
      };

      const tagNames = tagInput
        .split(/[,，]/)
        .map((n) => n.trim())
        .filter(Boolean);

      const imageSigned = signed.slice(0, files.length);
      const videoSigned = videoFile ? signed[files.length] : undefined;

      async function processOne(file: File, sig: { key: string; url: string }) {
        const key = keyOf(file);
        try {
          setStatus(key, { state: "uploading", pct: 5 });
          await uploadWithProgress(sig.url, file, (pct) => {
            setStatus(key, { state: "uploading", pct: Math.max(5, pct) });
          });
          setStatus(key, { state: "completing", pct: 100 });

          let videoKey: string | undefined;
          if (videoFile && videoSigned && file === files[files.length - 1]) {
            await uploadWithProgress(videoSigned.url, videoFile, () => {});
            videoKey = videoSigned.key;
          }

          const completeRes = await fetch("/api/upload/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: sig.key,
              originalName: file.name,
              mime: file.type,
              size: file.size,
              albumIds: [...albumIds],
              tagNames,
              visibility,
              videoKey,
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
            return;
          }
          setStatus(key, {
            state: result?.duplicate ? "duplicate" : "done",
            pct: 100,
          });
        } catch (error) {
          setStatus(key, {
            state: "failed",
            pct: 100,
            error: (error as Error).message,
          });
        }
      }

      const CONCURRENCY = 3;
      let nextIndex = 0;

      async function worker() {
        while (nextIndex < files.length) {
          const i = nextIndex++;
          const file = files[i];
          const sig = imageSigned[i];
          if (!sig) {
            setStatus(keyOf(file), { state: "failed", pct: 0, error: "未获取到签名" });
            continue;
          }
          await processOne(file, sig);
        }
      }

      const workers = Array.from({ length: Math.min(CONCURRENCY, files.length) }, () => worker());
      await Promise.all(workers);
    } finally {
      setBusy(false);
      onUploaded();
      setFiles((prev) => prev.filter((f) => {
        const s = statuses[keyOf(f)];
        return s?.state !== "done" && s?.state !== "duplicate";
      }));
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">上传图片</h2>
        <div className="flex items-center gap-1">
          {files.length > 0 && (
            <Button variant="ghost" size="sm" onPress={clearAll}>
              清除
            </Button>
          )}
          <CloseButton onPress={onClose} aria-label="关闭" />
        </div>
      </div>

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
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
            : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
        }`}
      >
        <p className="text-sm font-medium">拖拽图片到此处，或点击选择文件</p>
        <p className="text-xs opacity-60">
          支持 JPG / PNG / WebP / GIF / AVIF / SVG，单张 ≤50MB，批量 ≤{MAX_BATCH_SIZE} 张
        </p>
        <p className="text-xs opacity-60">
          支持自动识别 Google/三星/小米/OPPO/vivo 动态照片
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

      <div className="mt-3">
        <div
          onClick={() => videoInputRef.current?.click()}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-neutral-300 p-3 text-center text-sm transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-neutral-700 dark:hover:bg-blue-950/40"
        >
          <span className="text-xs opacity-60">
            Apple 实况照片：点击选择配套的 .mov/.mp4 视频文件（可选）
          </span>
          {videoFile && (
            <span className="ml-auto text-xs text-green-600">
              已选择: {videoFile.name}
            </span>
          )}
          {videoFile && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setVideoFile(null);
              }}
              className="text-xs text-red-500 hover:text-red-700"
            >
              移除
            </button>
          )}
        </div>
        <input
          ref={videoInputRef}
          type="file"
          accept={Object.keys(LIVE_PHOTO_MIME).join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            addVideoFile(file);
          }}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-1">
              可见性:
              <AppSelect
                value={visibility}
                onChange={(v) => setVisibility(v as typeof visibility)}
                options={[
                  { value: "public", label: "公开" },
                  { value: "private", label: "私密" },
                  { value: "password", label: "加密" },
                  { value: "hidden", label: "不展示" },
                ]}
                ariaLabel="上传可见性"
              />
            </label>
            <label className="flex items-center gap-1">
              标签:
              <Input
                value={tagInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
                placeholder="逗号分隔"
                className="w-40"
              />
            </label>
          </div>
          {albums.length > 0 && (
            <label className="flex items-center gap-1 text-sm">
              添加到相册:
              <AppMultiSelect
                selected={albumIds}
                onChange={setAlbumIds}
                options={albums.map((a) => ({ value: a.id, label: a.name }))}
                ariaLabel="选择相册"
                placeholder="选择相册（可多选）"
                className="min-w-[200px] flex-1"
              />
            </label>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
                  className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900"
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
                      <div className="flex h-full items-center justify-center text-xs opacity-40">
                        {f.type}
                      </div>
                    )}
                  </div>

                  {/* Status overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {status?.state === "uploading" && (
                      <div className="flex flex-col items-center gap-1">
                        <LoaderCircle className="h-6 w-6 animate-spin text-white drop-shadow-lg" />
                        <span className="rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
                          {pct}%
                        </span>
                      </div>
                    )}
                    {status?.state === "completing" && (
                      <LoaderCircle className="h-6 w-6 animate-spin text-white drop-shadow-lg" />
                    )}
                    {status?.state === "signing" && (
                      <LoaderCircle className="h-6 w-6 animate-spin text-white drop-shadow-lg" />
                    )}
                    {status?.state === "done" && (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/90 shadow-lg">
                        <Check className="h-5 w-5 text-white" />
                      </div>
                    )}
                    {status?.state === "duplicate" && (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/90 shadow-lg">
                        <Copy className="h-5 w-5 text-white" />
                      </div>
                    )}
                    {status?.state === "failed" && (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/90 shadow-lg">
                        <X className="h-5 w-5 text-white" />
                      </div>
                    )}
                    {status?.state === "waiting" && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
                        <Clock className="h-4 w-4 text-white/80" />
                      </div>
                    )}
                  </div>

                  {/* Upload progress bar */}
                  {status?.state === "uploading" && (
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-neutral-200/50 dark:bg-neutral-800/50">
                      <div
                        className="h-full bg-blue-500 transition-[width] duration-200 ease-linear"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}

                  {/* Bottom info bar */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6">
                    <p className="truncate text-[11px] font-medium text-white drop-shadow-sm">
                      {f.name}
                    </p>
                    <p className="text-[10px] text-white/60">
                      {(f.size / 1024 / 1024).toFixed(2)}MB
                    </p>
                  </div>

                  {/* Remove button (waiting only) */}
                  {status?.state === "waiting" && (
                    <button
                      type="button"
                      onClick={() => removeFile(key)}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-red-500 group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Error tooltip */}
                  {status?.state === "failed" && status.error && (
                    <div className="absolute inset-x-0 top-1 flex justify-center">
                      <span className="max-w-[90%] truncate rounded-full bg-red-600 px-2 py-0.5 text-[10px] text-white shadow-lg">
                        {status.error}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button variant="primary" onPress={startUpload} isDisabled={busy}>
              {busy ? "上传中…" : `开始上传 (${files.length}${videoFile ? " + 视频" : ""})`}
            </Button>
            {busy && (
              <Button variant="ghost" onPress={onClose} isDisabled={busy}>
                后台继续
              </Button>
            )}
          </div>
        </div>
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
