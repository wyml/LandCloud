/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Input } from "@heroui/react";
import type { AlbumDetail } from "@/server/queries/albums";
import type { CandidateImage } from "@/server/queries/images";
import {
  addImagesToAlbum,
  removeImagesFromAlbum,
  reorderAlbumImages,
  setAlbumCover,
  updateAlbum,
} from "@/server/actions/albums";
import { AppSelect } from "@/components/shared/app-select";
import { BlurImage } from "@/components/shared/blur-image";
import { AlertDialog, useAlertDialog } from "@/components/shared/alert-dialog";

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { dialog, showConfirm, closeDialog } = useAlertDialog();

  const allSelected = images.length > 0 && images.every((i) => selected.has(i.image_id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(images.map((i) => i.image_id)));
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

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
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(imageId);
      return next;
    });
  }

  async function batchRemove() {
    const ids = [...selected];
    await removeImagesFromAlbum({ albumId: album.id, imageIds: ids });
    setImages((prev) => prev.filter((i) => !selected.has(i.image_id)));
    setSelected(new Set());
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
          <Input
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            placeholder="相册名称 *"
            className="flex-1"
          />
          <AppSelect
            value={visibility}
            onChange={(v) => setVisibility(v as typeof visibility)}
            options={[
              { value: "public", label: "公开" },
              { value: "private", label: "私密" },
              { value: "password", label: "加密" },
              { value: "hidden", label: "不展示" },
            ]}
            ariaLabel="相册可见性"
          />
          <Input
            type="number"
            value={String(sortOrder)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSortOrder(Number(e.target.value) || 0)}
            placeholder="排序权重"
            className="w-28"
          />
        </div>
        <Input
          value={description}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
          placeholder="相册简介"
        />
        {visibility === "password" && (
          <Input
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            placeholder="访问密码（留空保持原密码）"
          />
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            封面:
            <AppSelect
              value={coverId}
              onChange={setCoverId}
              options={[
                { value: "", label: "自动（最新一张）" },
                ...images.map((entry) => ({
                  value: entry.image_id,
                  label: entry.image.title || entry.image.original_name,
                })),
              ]}
              ariaLabel="相册封面"
            />
          </label>
          <Button variant="primary" onPress={saveMeta} isDisabled={saving}>
            {saving ? "保存中…" : "保存相册设置"}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">相册内图片（{images.length}）</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onPress={toggleAll} isDisabled={images.length === 0}>
            {allSelected ? "取消全选" : "全选"}
          </Button>
          <Button variant="primary" onPress={() => setPickerOpen(true)}>
            添加图片
          </Button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950">
          <span className="font-medium">已选 {selected.size} 张</span>
          <Button size="sm" variant="ghost" onPress={() => setSelected(new Set())}>
            取消选择
          </Button>
          <div className="h-4 w-px bg-amber-300 dark:bg-amber-700" />
          <Button
            size="sm"
            variant="danger"
            onPress={() => {
              showConfirm("确认移除", `确认从相册中移除选中的 ${selected.size} 张图片？`, async () => {
                await batchRemove();
              });
            }}
          >
            批量移除
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {images.map((entry, index) => {
          const isSelected = selected.has(entry.image_id);
          return (
            <div
              key={entry.image_id}
              draggable
              onDragStart={() => setDraggingId(entry.image_id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDropTo(entry.image_id)}
              className={`group relative overflow-hidden rounded-xl border bg-neutral-100 ${
                draggingId === entry.image_id ? "opacity-40" : ""
              } ${
                isSelected
                  ? "border-blue-500 ring-2 ring-blue-500/40"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOne(entry.image_id);
                }}
                aria-label="选择"
                className={`absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                  isSelected
                    ? "border-blue-500 bg-blue-500"
                    : "border-white bg-black/30 backdrop-blur-sm hover:bg-black/50"
                }`}
              >
                {isSelected && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <div className="aspect-square w-full">
                <BlurImage
                  src={thumbUrl(entry.image_id, siteUrl, s3PublicBase, entry.image.s3_key)}
                  alt={entry.image.title || entry.image.original_name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <span className="absolute left-8 top-1 rounded bg-black/60 px-1.5 text-[10px] text-white">
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
          );
        })}
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
          <div className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-xl bg-white p-5 dark:bg-neutral-800">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">选择要添加的图片</h3>
              <Input
                value={pickerSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPickerSearch(e.target.value)}
                placeholder="搜索标题/文件名"
                className="flex-1"
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
                  className="group overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 text-left dark:border-neutral-800"
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

      <AlertDialog
        open={dialog.open}
        onClose={closeDialog}
        title={dialog.title}
        message={dialog.message}
        confirmLabel={dialog.confirmLabel}
        onConfirm={dialog.onConfirm}
        showCancel={dialog.showCancel}
      />
    </div>
  );
}
