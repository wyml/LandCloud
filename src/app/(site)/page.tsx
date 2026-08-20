import { Button, Card, CardContent, CardHeader, CardTitle } from "@heroui/react";

export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>PicBed 个人图床</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm opacity-70">
            M0 基础设施已就绪：Next.js 16 + HeroUI v3 + Supabase 客户端封装。
          </p>
          <div>
            <Button variant="primary">HeroUI 冒烟测试</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
