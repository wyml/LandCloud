import { Card, CardContent, CardHeader, CardTitle } from "@heroui/react";
import { getSiteUrl } from "@/lib/env";
import { getDashboardStats } from "@/server/queries/dashboard";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "待处理",
  processing: "处理中",
  done: "完成",
  failed: "失败",
};

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();
  const siteUrl = getSiteUrl();

  const cards = [
    { label: "图片总数", value: stats.imageCount.toLocaleString("zh-CN") },
    { label: "相册总数", value: stats.albumCount.toLocaleString("zh-CN") },
    { label: "总浏览量", value: stats.totalViews.toLocaleString("zh-CN") },
    { label: "存储用量", value: formatBytes(stats.storageBytes) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">仪表盘</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardTitle className="text-sm font-normal opacity-60">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">最近上传</h2>
        {stats.recentImages.length === 0 ? (
          <p className="py-10 text-center text-sm opacity-60">暂无图片，请先上传。</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {stats.recentImages.map((image) => (
              <a
                key={image.id}
                href={`/admin/images?q=${encodeURIComponent(image.original_name)}`}
                className="group overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${siteUrl}/f/${image.id}/thumb_md`}
                    alt={image.title || image.original_name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <span
                    className={`absolute right-1 top-1 rounded px-1 py-0.5 text-[10px] text-white ${
                      image.processing_status === "done"
                        ? "bg-black/60"
                        : image.processing_status === "failed"
                          ? "bg-red-600"
                          : "bg-amber-600"
                    }`}
                  >
                    {STATUS_LABEL[image.processing_status] ?? image.processing_status}
                  </span>
                </div>
                <p className="truncate px-2 py-1 text-xs opacity-70">
                  {image.title || image.original_name}
                </p>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
