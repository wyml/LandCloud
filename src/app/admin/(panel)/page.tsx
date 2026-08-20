import { Card, CardContent, CardHeader, CardTitle } from "@heroui/react";

const stats = [
  { label: "图片总数", value: "—" },
  { label: "相册总数", value: "—" },
  { label: "总浏览量", value: "—" },
  { label: "存储用量", value: "—" },
];

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">仪表盘</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
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
      <p className="text-sm opacity-60">统计与最近上传将在 M8 里程碑接入真实数据。</p>
    </div>
  );
}
