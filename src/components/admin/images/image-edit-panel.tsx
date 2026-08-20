/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { Button, Input, TextArea, Surface, Checkbox, Chip } from "@heroui/react";
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
      <Surface
        variant="default"
        className="flex h-full w-full max-w-md flex-col overflow-y-auto p-5"
      >
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
            <span className="text-sm">标题</span>
            <Input
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm">描述</span>
            <TextArea
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              rows={3}
            />
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-sm">可见性</span>
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
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm">拍摄时间</span>
            <Input
              type="datetime-local"
              value={takenAt}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTakenAt(e.target.value)}
            />
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-sm">标签</span>
            <div className="flex flex-wrap gap-1.5">
              {tagNames.map((name) => (
                <Chip key={name} size="sm" variant="soft">
                  {name}
                  <button
                    type="button"
                    onClick={() => setTagNames((prev) => prev.filter((n) => n !== name))}
                    className="ml-1 opacity-50 hover:opacity-100"
                    aria-label={`移除 ${name}`}
                  >
                    ×
                  </button>
                </Chip>
              ))}
            </div>
            <div className="flex gap-1">
              <Input
                value={tagInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="输入标签后回车添加"
                className="flex-1"
              />
              <Button size="sm" onPress={addTag}>
                添加
              </Button>
            </div>
          </div>

          {albums.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-sm">所属相册</span>
              <div className="flex flex-wrap gap-2">
                {albums.map((a) => (
                  <Checkbox
                    key={a.id}
                    isSelected={albumIds.has(a.id)}
                    onChange={() => toggleAlbum(a.id)}
                  >
                    {a.name}
                  </Checkbox>
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
      </Surface>
    </div>
  );
}
