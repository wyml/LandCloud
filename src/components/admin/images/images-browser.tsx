/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import type { ImageWithRelations, TagWithCount, AlbumOption } from "@/lib/types";
import {
  bulkAddTags,
  bulkMoveToAlbum,
  bulkSetVisibility,
  deleteImages,
} from "@/server/actions/images";
import { ImageEditPanel } from "./image-edit-panel";
import { MobileUploadDialog } from "./mobile-upload-dialog";
import { UploadPanel } from "./upload-panel";
import { AppSelect } from "@/components/shared/app-select";

const PAGE_SIZE = 24;

export interface ImagesFilters {
  albumId: string | null;
  tagId: string | null;
  visibility: string | null;
  status: string | null;
  q: string | null;
  sort: "created_at" | "taken_at" | "view_count";
  dir: "asc" | "desc";
}

interface ImagesBrowserProps {
  images: ImageWithRelations[];
  total: number;
  page: number;
  filters: ImagesFilters;
  albums: AlbumOption[];
  tags: TagWithCount[];
  siteUrl: string;
  s3PublicBase: string | null;
  preferDirect?: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "待处理",
  processing: "处理中",
  done: "完成",
  failed: "失败",
};

const VISIBILITY_LABEL: Record<string, string> = {
  public: "公开",
  private: "私密",
  password: "加密",
};

function buildQuery(current: ImagesFilters, patch: Partial<ImagesFilters>): string {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();
  if (next.albumId) params.set("album", next.albumId);
  if (next.tagId) params.set("tag", next.tagId);
  if (next.visibility) params.set("visibility", next.visibility);
  if (next.status) params.set("status", next.status);
  if (next.q) params.set("q", next.q);
  if (next.sort !== "created_at") params.set("sort", next.sort);
  if (next.dir !== "desc") params.set("dir", next.dir);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function ImagesBrowser({
  images,
  total,
  page,
  filters,
  albums,
  tags,
  siteUrl,
  s3PublicBase,
  preferDirect = false,
}: ImagesBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [view, setView] = useState<"grid" | "table">("grid");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editImage, setEditImage] = useState<ImageWithRelations | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [bulkTag, setBulkTag] = useState("");
  const [bulkAlbum, setBulkAlbum] = useState("");
  const [search, setSearch] = useState(filters.q ?? "");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allSelected = images.length > 0 && images.every((i) => selected.has(i.id));

  const selectable = useMemo(() => images.map((i) => i.id), [images]);

  function navigate(patch: Partial<ImagesFilters>) {
    router.push(`${pathname}${buildQuery(filters, patch)}`);
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectable));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  const proxyThumb = (image: ImageWithRelations) => `${siteUrl}/f/${image.id}/thumb_md`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-semibold">图片管理</h1>
        <Button variant="primary" onPress={() => setUploadOpen(true)}>
          上传图片
        </Button>
        <MobileUploadDialog />
        <div className="flex overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={`px-3 py-1.5 text-sm ${
              view === "grid" ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black" : ""
            }`}
          >
            网格
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            className={`px-3 py-1.5 text-sm ${
              view === "table"
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black"
                : ""
            }`}
          >
            表格
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ q: search || null });
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题/文件名/描述"
            className="rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-700 bg-white dark:bg-neutral-800"
          />
          <Button type="submit" size="sm">
            搜索
          </Button>
        </form>

        <AppSelect
          value={filters.albumId ?? ""}
          onChange={(v) => navigate({ albumId: v || null })}
          options={[
            { value: "", label: "全部相册" },
            ...albums.map((a) => ({
              value: a.id,
              label: `${a.name}（${VISIBILITY_LABEL[a.visibility]}）`,
            })),
          ]}
          ariaLabel="按相册筛选"
        />

        <AppSelect
          value={filters.tagId ?? ""}
          onChange={(v) => navigate({ tagId: v || null })}
          options={[
            { value: "", label: "全部标签" },
            ...tags.map((t) => ({ value: t.id, label: `${t.name}（${t.count}）` })),
          ]}
          ariaLabel="按标签筛选"
        />

        <AppSelect
          value={filters.visibility ?? ""}
          onChange={(v) => navigate({ visibility: v || null })}
          options={[
            { value: "", label: "全部可见性" },
            { value: "public", label: "公开" },
            { value: "private", label: "私密" },
            { value: "password", label: "加密" },
          ]}
          ariaLabel="按可见性筛选"
        />

        <AppSelect
          value={filters.status ?? ""}
          onChange={(v) => navigate({ status: v || null })}
          options={[
            { value: "", label: "全部状态" },
            { value: "done", label: "完成" },
            { value: "failed", label: "失败" },
            { value: "processing", label: "处理中" },
            { value: "pending", label: "待处理" },
          ]}
          ariaLabel="按状态筛选"
        />

        <AppSelect
          value={filters.sort}
          onChange={(v) => navigate({ sort: v as ImagesFilters["sort"] })}
          options={[
            { value: "created_at", label: "按上传时间" },
            { value: "taken_at", label: "按拍摄时间" },
            { value: "view_count", label: "按浏览量" },
          ]}
          ariaLabel="排序方式"
        />

        <button
          type="button"
          onClick={() => navigate({ dir: filters.dir === "desc" ? "asc" : "desc" })}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-700 bg-white dark:bg-neutral-800"
        >
          {filters.dir === "desc" ? "↓ 倒序" : "↑ 正序"}
        </button>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950">
          <span className="font-medium">已选 {selected.size} 张</span>
          <Button
            size="sm"
            onPress={async () => {
              await bulkSetVisibility({
                imageIds: [...selected],
                visibility: "public",
              });
              setSelected(new Set());
            }}
          >
            设为公开
          </Button>
          <Button
            size="sm"
            onPress={async () => {
              await bulkSetVisibility({
                imageIds: [...selected],
                visibility: "private",
              });
              setSelected(new Set());
            }}
          >
            设为私密
          </Button>
          <input
            value={bulkTag}
            onChange={(e) => setBulkTag(e.target.value)}
            placeholder="批量添加标签（逗号分隔）"
            className="rounded-lg border border-neutral-300 px-2 py-1.5 dark:border-neutral-700 bg-white dark:bg-neutral-800"
          />
          <Button
            size="sm"
            onPress={async () => {
              const names = bulkTag.split(/[,，]/).map((n) => n.trim());
              if (names.length > 0) {
                await bulkAddTags({ imageIds: [...selected], tagNames: names });
                setBulkTag("");
              }
            }}
          >
            加标签
          </Button>
          <AppSelect
            value={bulkAlbum}
            onChange={setBulkAlbum}
            options={[
              { value: "", label: "移动到相册…" },
              ...albums.map((a) => ({ value: a.id, label: a.name })),
            ]}
            ariaLabel="批量移动到相册"
          />
          <Button
            size="sm"
            onPress={async () => {
              if (bulkAlbum) {
                await bulkMoveToAlbum({
                  imageIds: [...selected],
                  albumId: bulkAlbum,
                });
                setBulkAlbum("");
              }
            }}
          >
            移动
          </Button>
          <Button
            size="sm"
            variant="danger"
            onPress={async () => {
              if (window.confirm(`确认删除选中的 ${selected.size} 张图片？`)) {
                await deleteImages([...selected]);
                setSelected(new Set());
              }
            }}
          >
            删除
          </Button>
        </div>
      )}

      {uploadOpen && (
        <UploadPanel
          albums={albums}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => router.refresh()}
        />
      )}

      {view === "grid" ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {images.map((image) => {
            const isSelected = selected.has(image.id);
            return (
              <div
                key={image.id}
                className={`group relative overflow-hidden rounded-xl border bg-neutral-100 ${
                  isSelected
                    ? "border-blue-500 ring-2 ring-blue-500/40"
                    : "border-neutral-200 dark:border-neutral-800"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setEditImage(image)}
                  className="block w-full"
                  aria-label={`编辑 ${image.title || image.original_name}`}
                >
                  <div className="aspect-square w-full overflow-hidden">
                    <img
                      src={proxyThumb(image)}
                      alt={image.title || image.original_name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.opacity = "0.15";
                      }}
                    />
                  </div>
                </button>
                <div className="p-2">
                  <p className="truncate text-xs">{image.title || image.original_name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                    <span
                      className={`rounded px-1 py-0.5 ${
                        image.processing_status === "done"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : image.processing_status === "failed"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                      }`}
                    >
                      {STATUS_LABEL[image.processing_status]}
                    </span>
                    <span className="rounded bg-neutral-200 px-1 py-0.5 dark:bg-neutral-800">
                      {VISIBILITY_LABEL[image.visibility]}
                    </span>
                    <span className="opacity-60">👁 {image.view_count}</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOne(image.id)}
                  className="absolute left-2 top-2 h-4 w-4 rounded"
                  aria-label="选择"
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                <th className="p-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="全选"
                  />
                </th>
                <th className="p-3">图片</th>
                <th className="p-3">标题</th>
                <th className="p-3">可见性</th>
                <th className="p-3">状态</th>
                <th className="p-3">浏览量</th>
                <th className="p-3">上传时间</th>
              </tr>
            </thead>
            <tbody>
              {images.map((image) => {
                const isSelected = selected.has(image.id);
                return (
                  <tr
                    key={image.id}
                    className={`border-b border-neutral-100 dark:border-neutral-900 ${
                      isSelected ? "bg-blue-50 dark:bg-blue-950/40" : ""
                    }`}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(image.id)}
                        aria-label="选择"
                      />
                    </td>
                    <td className="p-3">
                      <button type="button" onClick={() => setEditImage(image)}>
                        <img
                          src={proxyThumb(image)}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.opacity = "0.15";
                          }}
                        />
                      </button>
                    </td>
                    <td className="max-w-[200px] p-3">
                      <button
                        type="button"
                        onClick={() => setEditImage(image)}
                        className="truncate hover:underline"
                      >
                        {image.title || image.original_name}
                      </button>
                    </td>
                    <td className="p-3">{VISIBILITY_LABEL[image.visibility]}</td>
                    <td className="p-3">{STATUS_LABEL[image.processing_status]}</td>
                    <td className="p-3">{image.view_count}</td>
                    <td className="p-3 text-xs opacity-70">
                      {new Date(image.created_at).toLocaleString("zh-CN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() =>
                router.push(
                  `${pathname}?${new URLSearchParams({
                    ...(filters.albumId ? { album: filters.albumId } : {}),
                    ...(filters.tagId ? { tag: filters.tagId } : {}),
                    ...(filters.visibility ? { visibility: filters.visibility } : {}),
                    ...(filters.status ? { status: filters.status } : {}),
                    ...(filters.q ? { q: filters.q } : {}),
                    ...(filters.sort !== "created_at" ? { sort: filters.sort } : {}),
                    ...(filters.dir !== "desc" ? { dir: filters.dir } : {}),
                    page: String(p),
                  })}`,
                )
              }
              className={`h-8 w-8 rounded-lg text-sm ${
                p === page
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black"
                  : "border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {editImage && (
        <ImageEditPanel
          image={editImage}
          albums={albums}
          siteUrl={siteUrl}
          s3PublicBase={s3PublicBase}
          preferDirect={preferDirect}
          onClose={() => setEditImage(null)}
        />
      )}
    </div>
  );
}
