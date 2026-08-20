/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@heroui/react";
import type { AlbumListItem } from "@/server/queries/albums";
import { createAlbum, deleteAlbum, updateAlbum } from "@/server/actions/albums";

const VISIBILITY_LABEL: Record<string, string> = {
  public: "公开",
  private: "私密",
  password: "加密",
};

function coverUrl(album: AlbumListItem, siteUrl: string, s3PublicBase: string | null) {
  if (!album.cover) return null;
  if (s3PublicBase) {
    const dir = album.cover.s3_key.slice(0, album.cover.s3_key.lastIndexOf("/") + 1);
    return `${s3PublicBase}/${dir}thumb_lg.webp`;
  }
  return `${siteUrl}/f/${album.cover.id}/thumb_lg`;
}

interface AlbumFormState {
  name: string;
  description: string;
  visibility: "public" | "private" | "password";
  sortOrder: number;
  password: string;
}

const EMPTY_FORM: AlbumFormState = {
  name: "",
  description: "",
  visibility: "public",
  sortOrder: 0,
  password: "",
};

interface AlbumsManagerProps {
  albums: AlbumListItem[];
  siteUrl: string;
  s3PublicBase: string | null;
}

export function AlbumsManager({ albums, siteUrl, s3PublicBase }: AlbumsManagerProps) {
  const [form, setForm] = useState<AlbumFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEdit(album: AlbumListItem) {
    setEditingId(album.id);
    setForm({
      name: album.name,
      description: album.description,
      visibility: album.visibility,
      sortOrder: album.sort_order,
      password: "",
    });
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateAlbum(editingId, form);
      } else {
        await createAlbum(form);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">相册管理</h1>

      <form
        onSubmit={submit}
        className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
      >
        <h2 className="text-sm font-semibold">{editingId ? "编辑相册" : "新建相册"}</h2>
        <div className="flex flex-wrap gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="相册名称 *"
            required
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <select
            value={form.visibility}
            onChange={(e) =>
              setForm({ ...form, visibility: e.target.value as typeof form.visibility })
            }
            className="rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="public">公开</option>
            <option value="private">私密</option>
            <option value="password">加密</option>
          </select>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
            placeholder="排序权重"
            className="w-28 rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="相册简介"
          className="rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
        />
        {form.visibility === "password" && (
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={editingId ? "新密码（留空则保持原密码）" : "访问密码 *"}
            required={!editingId}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
          />
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" variant="primary" isDisabled={saving}>
            {saving ? "保存中…" : editingId ? "保存修改" : "创建相册"}
          </Button>
          {editingId && (
            <Button
              variant="ghost"
              onPress={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
            >
              取消
            </Button>
          )}
        </div>
      </form>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {albums.map((album) => {
          const cover = coverUrl(album, siteUrl, s3PublicBase);
          return (
            <div
              key={album.id}
              className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"
            >
              <Link href={`/admin/albums/${album.id}`} className="block">
                <div className="flex h-40 items-center justify-center bg-neutral-100 dark:bg-neutral-900">
                  {cover ? (
                    <img
                      src={cover}
                      alt={album.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-sm opacity-40">暂无封面</span>
                  )}
                </div>
              </Link>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/admin/albums/${album.id}`}
                    className="truncate font-medium hover:underline"
                  >
                    {album.name}
                  </Link>
                  <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800">
                    {VISIBILITY_LABEL[album.visibility]}
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 text-xs opacity-60">
                  {album.description || "无简介"}
                </p>
                <p className="mt-1 text-xs opacity-60">
                  {album.imageCount} 张 · 浏览量 {album.view_count} · 权重 {album.sort_order}
                </p>
                <div className="mt-2 flex gap-2">
                  <Link href={`/admin/albums/${album.id}`}>
                    <Button size="sm" variant="outline">
                      管理图片
                    </Button>
                  </Link>
                  <Button size="sm" onPress={() => openEdit(album)}>
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onPress={async () => {
                      if (window.confirm(`删除相册「${album.name}」？仅解除关联，不会删除图片。`)) {
                        await deleteAlbum(album.id);
                      }
                    }}
                  >
                    删除
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {albums.length === 0 && (
          <p className="col-span-full py-8 text-center opacity-60">暂无相册，请在上方创建</p>
        )}
      </div>
    </div>
  );
}
