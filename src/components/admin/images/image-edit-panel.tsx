/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import type { AlbumOption, ImageWithRelations } from "@/lib/types";
import {
  deleteImages,
  setImageAlbums,
  setImageTags,
  updateImageDetails,
} from "@/server/actions/images";
import { ExternalLinks } from "./external-links";
import { AppSelect } from "@/components/shared/app-select";

interface ImageEditPanelProps {
  image: ImageWithRelations;
  albums: AlbumOption[];
  siteUrl: string;
  s3PublicBase: string | null;
  preferDirect?: boolean;
  onClose: () => void;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function ImageEditPanel({
  image,
  albums,
  siteUrl,
  s3PublicBase,
  preferDirect = false,
  onClose,
}: ImageEditPanelProps) {
  const [title, setTitle] = useState(image.title);
  const [description, setDescription] = useState(image.description);
  const [visibility, setVisibility] = useState(image.visibility);
  const [takenAt, setTakenAt] = useState(toDatetimeLocal(image.taken_at));
  const [tagInput, setTagInput] = useState("");
  const [tagNames, setTagNames] = useState<string[]>(image.tags.map((t) => t.name));
  const [albumIds, setAlbumIds] = useState<Set<string>>(new Set(image.albumIds));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleAlbum(id: string) {
    setAlbumIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addTag() {
    const name = tagInput.trim();
    if (!name) return;
    if (!tagNames.includes(name)) setTagNames((prev) => [...prev, name]);
    setTagInput("");
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateImageDetails({
        id: image.id,
        title,
        description,
        visibility,
        takenAt: takenAt || null,
      });
      await setImageAlbums({ imageId: image.id, albumIds: [...albumIds] });
      await setImageTags({ imageId: image.id, tagNames });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function reprocess() {
    setError(null);
    const res = await fetch("/api/upload/reprocess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: image.id }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "重试失败");
    } else {
      window.alert("已重新处理，稍后刷新查看状态");
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/40"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-5 dark:bg-neutral-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">编辑图片</h2>
          <Button variant="ghost" size="sm" onPress={onClose}>
            关闭
          </Button>
        </div>

        <div className="mb-4">
          <img
            src={`${siteUrl}/f/${image.id}/thumb_lg`}
            alt={image.title || image.original_name}
            className="aspect-video w-full rounded-lg object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <label className="flex flex-col gap-1">
            标题
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            />
          </label>

          <label className="flex flex-col gap-1">
            描述
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            />
          </label>

          <label className="flex flex-col gap-1">
            可见性
            <AppSelect
              value={visibility}
              onChange={(v) => setVisibility(v as typeof visibility)}
              options={[
                { value: "public", label: "公开" },
                { value: "private", label: "私密" },
                { value: "password", label: "加密" },
              ]}
              ariaLabel="图片可见性"
              fullWidth
            />
          </label>

          <label className="flex flex-col gap-1">
            拍摄时间
            <input
              type="datetime-local"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            />
          </label>

          <div className="flex flex-col gap-1">
            <span>标签</span>
            <div className="flex flex-wrap gap-1.5">
              {tagNames.map((name) => (
                <span
                  key={name}
                  className="flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs dark:bg-neutral-800"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => setTagNames((prev) => prev.filter((n) => n !== name))}
                    className="opacity-50 hover:opacity-100"
                    aria-label={`移除 ${name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="输入标签后回车添加"
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              />
              <Button size="sm" onPress={addTag}>
                添加
              </Button>
            </div>
          </div>

          {albums.length > 0 && (
            <div className="flex flex-col gap-1">
              <span>所属相册</span>
              <div className="flex flex-wrap gap-2">
                {albums.map((a) => (
                  <label
                    key={a.id}
                    className="flex cursor-pointer items-center gap-1 rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  >
                    <input
                      type="checkbox"
                      checked={albumIds.has(a.id)}
                      onChange={() => toggleAlbum(a.id)}
                    />
                    {a.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <ExternalLinks
            image={image}
            siteUrl={siteUrl}
            s3PublicBase={s3PublicBase}
            preferDirect={preferDirect}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="primary" onPress={save} isDisabled={saving}>
              {saving ? "保存中…" : "保存"}
            </Button>
            {image.processing_status !== "done" && (
              <Button variant="outline" onPress={reprocess}>
                重新处理
              </Button>
            )}
            <Button
              variant="danger"
              onPress={async () => {
                if (window.confirm(`确认删除图片「${image.title}」？`)) {
                  await deleteImages([image.id]);
                  onClose();
                }
              }}
            >
              删除
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
