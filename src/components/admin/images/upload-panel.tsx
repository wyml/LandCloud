"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@heroui/react";
import type { AlbumOption } from "@/lib/types";
import {
  ACCEPTED_MIME,
  MAX_BATCH_SIZE,
  MAX_FILE_SIZE,
  isAcceptedMime,
} from "@/lib/images/variants";
import { AppSelect } from "@/components/shared/app-select";

type FileState =
  | { state: "waiting" | "signing" | "completing"; pct: number }
  | { state: "uploading"; pct: number }
  | { state: "done" | "failed" | "duplicate"; pct: number; error?: string };

interface UploadPanelProps {
  albums: AlbumOption[];
  onClose: () => void;
  onUploaded: () => void;
}

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

export function UploadPanel({ albums, onClose, onUploaded }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [statuses, setStatuses] = useState<Record<string, FileState>>({});
  const [tagInput, setTagInput] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private" | "password">("public");
  const [albumIds, setAlbumIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const setStatus = useCallback((key: string, s: FileState) => {
    setStatuses((prev) => ({ ...prev, [key]: s }));
  }, []);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list);
    if (picked.length === 0) return;
    if (files.length + picked.length > MAX_BATCH_SIZE) {
      window.alert(`单次最多上传 ${MAX_BATCH_SIZE} 个文件`);
      return;
    }
    const valid: File[] = [];
    for (const f of picked) {
      if (!isAcceptedMime(f.type)) {
        window.alert(`不支持的文件类型: ${f.name} (${f.type})`);
        continue;
      }
      if (f.size <= 0 || f.size > MAX_FILE_SIZE) {
        window.alert(`文件大小超出限制 (≤50MB): ${f.name}`);
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
  }

  function removeFile(key: string) {
    setFiles((prev) => prev.filter((f) => keyOf(f) !== key));
    setStatuses((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function keyOf(f: File) {
    return f.name + ":" + f.size;
  }

  async function startUpload() {
    if (files.length === 0 || busy) return;
    setBusy(true);

    try {
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: files.map((f) => ({ name: f.name, mime: f.type, size: f.size })),
        }),
      });
      if (!presignRes.ok) {
        const body = await presignRes.json().catch(() => null);
        window.alert(body?.error ?? "预签名失败");
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: sig.key,
              originalName: file.name,
              mime: file.type,
              size: file.size,
              albumIds: [...albumIds],
              tagNames,
              visibility,
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
    } finally {
      setBusy(false);
      onUploaded();
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">上传图片</h2>
        <Button variant="ghost" size="sm" onPress={onClose}>
          关闭
        </Button>
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
            : "border-neutral-300 dark:border-neutral-700"
        }`}
      >
        <p className="text-sm font-medium">拖拽图片到此处，或点击选择文件</p>
        <p className="text-xs opacity-60">
          支持 JPG / PNG / WebP / GIF / AVIF / SVG，单张 ≤50MB，批量 ≤{MAX_BATCH_SIZE} 张
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
                ]}
                ariaLabel="上传可见性"
              />
            </label>
            <label className="flex items-center gap-1">
              标签:
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="逗号分隔"
                className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700"
              />
            </label>
          </div>
          {albums.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {albums.map((a) => (
                <label
                  key={a.id}
                  className="flex cursor-pointer items-center gap-1 rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
                >
                  <input
                    type="checkbox"
                    checked={albumIds.has(a.id)}
                    onChange={() => {
                      setAlbumIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(a.id)) next.delete(a.id);
                        else next.add(a.id);
                        return next;
                      });
                    }}
                  />
                  {a.name}
                </label>
              ))}
            </div>
          )}

          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto text-sm">
            {files.map((f) => {
              const key = keyOf(f);
              const status = statuses[key];
              return (
                <li
                  key={key}
                  className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-1.5"
                >
                  <span className="max-w-[240px] truncate">{f.name}</span>
                  <span className="text-xs opacity-50">{(f.size / 1024 / 1024).toFixed(2)}MB</span>
                  {status?.state === "uploading" && (
                    <div className="h-1.5 w-24 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
                      <div className="h-full bg-blue-500" style={{ width: `${status.pct}%` }} />
                    </div>
                  )}
                  <span className="ml-auto text-xs">
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

          <div className="flex gap-2">
            <Button variant="primary" onPress={startUpload} isDisabled={busy}>
              {busy ? "上传中…" : `开始上传 (${files.length})`}
            </Button>
            {busy && (
              <Button variant="ghost" onPress={onClose} isDisabled={busy}>
                后台继续
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
