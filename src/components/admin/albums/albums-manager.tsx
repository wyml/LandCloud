/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Chip, Input } from "@heroui/react";
import { Eye, Images, ArrowUpDown, Lock, Globe, EyeOff } from "lucide-react";
import type { AlbumListItem } from "@/server/queries/albums";
import {
  bulkDeleteAlbums,
  bulkSetAlbumVisibility,
  createAlbum,
  deleteAlbum,
  updateAlbum,
} from "@/server/actions/albums";
import { AppSelect } from "@/components/shared/app-select";
import { BlurImage } from "@/components/shared/blur-image";
import { AlertDialog, useAlertDialog } from "@/components/shared/alert-dialog";

const VISIBILITY_LABEL: Record<string, string> = {
  public: "公开",
  private: "私密",
  password: "加密",
  hidden: "不展示",
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
  visibility: "public" | "private" | "password" | "hidden";
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { dialog, showConfirm, closeDialog } = useAlertDialog();

  const allSelected = albums.length > 0 && albums.every((a) => selected.has(a.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(albums.map((a) => a.id)));
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

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
      <div className="flex items-center gap-2">
        <h1 className="mr-auto text-2xl font-semibold">相册管理</h1>
        <Button variant="ghost" size="sm" onPress={toggleAll}>
          {allSelected ? "取消全选" : "全选"}
        </Button>
      </div>

      <form
        onSubmit={submit}
        className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
      >
        <h2 className="text-sm font-semibold">{editingId ? "编辑相册" : "新建相册"}</h2>
        <div className="flex flex-wrap gap-3">
          <Input
            value={form.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}
            placeholder="相册名称 *"
            required
            className="flex-1"
          />
          <AppSelect
            value={form.visibility}
            onChange={(v) => setForm({ ...form, visibility: v as typeof form.visibility })}
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
            value={String(form.sortOrder)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
            placeholder="排序权重"
            className="w-28"
          />
        </div>
        <Input
          value={form.description}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, description: e.target.value })}
          placeholder="相册简介"
        />
        {form.visibility === "password" && (
          <Input
            type="password"
            value={form.password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, password: e.target.value })}
            placeholder={editingId ? "新密码（留空则保持原密码）" : "访问密码 *"}
            required={!editingId}
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

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950">
          <span className="font-medium">已选 {selected.size} 个</span>
          <Button size="sm" variant="ghost" onPress={() => setSelected(new Set())}>
            取消选择
          </Button>
          <div className="h-4 w-px bg-amber-300 dark:bg-amber-700" />
          <Button
            size="sm"
            onPress={async () => {
              await bulkSetAlbumVisibility({ albumIds: [...selected], visibility: "public" });
              setSelected(new Set());
            }}
          >
            设为公开
          </Button>
          <Button
            size="sm"
            onPress={async () => {
              await bulkSetAlbumVisibility({ albumIds: [...selected], visibility: "private" });
              setSelected(new Set());
            }}
          >
            设为私密
          </Button>
          <Button
            size="sm"
            onPress={async () => {
              await bulkSetAlbumVisibility({ albumIds: [...selected], visibility: "hidden" });
              setSelected(new Set());
            }}
          >
            设为不展示
          </Button>
          <div className="h-4 w-px bg-amber-300 dark:bg-amber-700" />
          <Button
            size="sm"
            variant="danger"
            onPress={() => {
              showConfirm("确认删除", `确认删除选中的 ${selected.size} 个相册？仅删除相册，不会删除图片。`, async () => {
                await bulkDeleteAlbums([...selected]);
                setSelected(new Set());
              });
            }}
          >
            删除
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {albums.map((album) => {
          const cover = coverUrl(album, siteUrl, s3PublicBase);
          const isSelected = selected.has(album.id);
          return (
            <div
              key={album.id}
              className={`relative overflow-hidden rounded-xl border ${
                isSelected
                  ? "border-blue-500 ring-2 ring-blue-500/40"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOne(album.id);
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
              <Link href={`/admin/albums/${album.id}`} className="block">
                <div className="flex h-40 items-center justify-center bg-neutral-100">
                  {cover ? (
                    <BlurImage
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
                  <Chip
                    size="sm"
                    variant="soft"
                    color={album.visibility === "public" ? "success" : album.visibility === "hidden" ? "warning" : "default"}
                  >
                    {album.visibility === "public" ? <Globe className="h-3.5 w-3.5" /> :
                     album.visibility === "password" ? <Lock className="h-3.5 w-3.5" /> :
                     album.visibility === "hidden" ? <EyeOff className="h-3.5 w-3.5" /> :
                     <Eye className="h-3.5 w-3.5" />}
                    <Chip.Label>{VISIBILITY_LABEL[album.visibility]}</Chip.Label>
                  </Chip>
                </div>
                <p className="mt-1 line-clamp-1 text-xs opacity-60">
                  {album.description || "无简介"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Chip size="sm" variant="soft">
                    <Images className="h-3.5 w-3.5" />
                    <Chip.Label>{album.imageCount} 张</Chip.Label>
                  </Chip>
                  <Chip size="sm" variant="soft">
                    <Eye className="h-3.5 w-3.5" />
                    <Chip.Label>{album.view_count}</Chip.Label>
                  </Chip>
                  <Chip size="sm" variant="soft">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    <Chip.Label>{album.sort_order}</Chip.Label>
                  </Chip>
                </div>
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
                    onPress={() => {
                      showConfirm("确认删除", `删除相册「${album.name}」？仅解除关联，不会删除图片。`, async () => {
                        await deleteAlbum(album.id);
                      });
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
