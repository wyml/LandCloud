/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@heroui/react";
import type { AlbumDetail } from "@/server/queries/albums";
import type { CandidateImage } from "@/server/queries/images";
import {
  addImagesToAlbum,
  removeImagesFromAlbum,
  reorderAlbumImages,
  setAlbumCover,
  updateAlbum,
} from "@/server/actions/albums";

function thumbUrl(
  imageId: string,
  siteUrl: string,
  s3PublicBase: string | null,
  s3Key: string,
): string {
  if (s3PublicBase) {
    const dir = s3Key.slice(0, s3Key.lastIndexOf("/") + 1);
    return `${s3PublicBase}/${dir}thumb_lg.webp`;
  }
  return `${siteUrl}/f/${imageId}/thumb_lg`;
}

interface AlbumEditorProps {
  album: AlbumDetail;
  candidates: CandidateImage[];
  siteUrl: string;
  s3PublicBase: string | null;
}

export function AlbumEditor({ album, candidates, siteUrl, s3PublicBase }: AlbumEditorProps) {
  const [name, setName] = useState(album.name);
  const [description, setDescription] = useState(album.description);
  const [visibility, setVisibility] = useState(album.visibility);
  const [sortOrder, setSortOrder] = useState(album.sort_order);
  const [password, setPassword] = useState("");
  const [images, setImages] = useState(album.images);
  const [coverId, setCoverId] = useState(album.cover?.id ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberIds = new Set(images.map((i) => i.image_id));
  const available = candidates.filter(
    (c) => !memberIds.has(c.id) && c.processing_status === "done",
  );
  const filtered = available.filter(
    (c) =>
      !pickerSearch || c.title.includes(pickerSearch) || c.original_name.includes(pickerSearch),
  );

  async function saveMeta() {
    setSaving(true);
    setError(null);
    try {
      await updateAlbum(album.id, {
        name,
        description,
        visibility,
        sortOrder,
        password: visibility === "password" ? password : undefined,
      });
      const coverImageId = coverId || null;
      if (coverImageId !== (album.cover?.id ?? null)) {
        await setAlbumCover(album.id, coverImageId);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function onDropTo(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    const list = [...images];
    const from = list.findIndex((i) => i.image_id === draggingId);
    const to = list.findIndex((i) => i.image_id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    setImages(list);
    setDraggingId(null);
    void reorderAlbumImages({
      albumId: album.id,
      orderedImageIds: list.map((i) => i.image_id),
    });
  }

  async function addSelected(imageIds: string[]) {
    await addImagesToAlbum({ albumId: album.id, imageIds });
    setPickerOpen(false);
    setPickerSearch("");
  }

  async function removeOne(imageId: string) {
    await removeImagesFromAlbum({ albumId: album.id, imageIds: [imageId] });
    setImages((prev) => prev.filter((i) => i.image_id !== imageId));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href="/admin/albums" className="text-sm opacity-60 hover:underline">
          ← 返回相册列表
        </Link>
        <h1 className="text-2xl font-semibold">编辑相册</h1>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex flex-wrap gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="相册名称 *"
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as typeof visibility)}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="public">公开</option>
            <option value="private">私密</option>
            <option value="password">加密</option>
          </select>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            placeholder="排序权重"
            className="w-28 rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="相册简介"
          className="rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
        />
        {visibility === "password" && (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="访问密码（留空保持原密码）"
            className="rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
          />
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            封面:
            <select
              value={coverId}
              onChange={(e) => setCoverId(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">自动（最新一张）</option>
              {images.map((entry) => (
                <option key={entry.image_id} value={entry.image_id}>
                  {entry.image.title || entry.image.original_name}
                </option>
              ))}
            </select>
          </label>
          <Button variant="primary" onPress={saveMeta} isDisabled={saving}>
            {saving ? "保存中…" : "保存相册设置"}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">相册内图片（{images.length}）</h2>
        <Button variant="primary" onPress={() => setPickerOpen(true)}>
          添加图片
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {images.map((entry, index) => (
          <div
            key={entry.image_id}
            draggable
            onDragStart={() => setDraggingId(entry.image_id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDropTo(entry.image_id)}
            className={`group relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 ${
              draggingId === entry.image_id ? "opacity-40" : ""
            }`}
          >
            <div className="aspect-square w-full">
              <img
                src={thumbUrl(entry.image_id, siteUrl, s3PublicBase, entry.image.s3_key)}
                alt={entry.image.title || entry.image.original_name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-[10px] text-white">
              {index + 1}
            </span>
            <div className="p-2">
              <p className="truncate text-xs">{entry.image.title || entry.image.original_name}</p>
              <p className="text-[10px] opacity-50">拖动排序 · {index + 1}</p>
            </div>
            <button
              type="button"
              onClick={() => removeOne(entry.image_id)}
              className="absolute right-1 top-1 rounded bg-black/60 px-1.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              移除
            </button>
          </div>
        ))}
        {images.length === 0 && (
          <p className="col-span-full py-8 text-center opacity-60">相册暂无图片，点击右上角添加</p>
        )}
      </div>

      {pickerOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-xl bg-white p-5 dark:bg-neutral-950">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">选择要添加的图片</h3>
              <input
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="搜索标题/文件名"
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
              />
              <Button variant="ghost" size="sm" onPress={() => setPickerOpen(false)}>
                关闭
              </Button>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto md:grid-cols-3 lg:grid-cols-4">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => void addSelected([c.id])}
                  className="group overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 text-left dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="aspect-square w-full">
                    <img
                      src={thumbUrl(c.id, siteUrl, s3PublicBase, c.s3_key)}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <p className="truncate p-1.5 text-xs group-hover:underline">
                    {c.title || c.original_name}
                  </p>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="col-span-full py-6 text-center text-sm opacity-60">
                  没有可添加的图片
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
