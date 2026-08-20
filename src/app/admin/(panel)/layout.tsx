import Link from "next/link";
import { Button } from "@heroui/react";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/server/actions/auth";

const navItems = [
  { href: "/admin", label: "仪表盘" },
  { href: "/admin/images", label: "图片管理" },
  { href: "/admin/albums", label: "相册管理" },
  { href: "/admin/tags", label: "标签管理" },
  { href: "/admin/shares", label: "分享管理" },
  { href: "/admin/settings", label: "站点设置" },
];

export default async function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 p-4 dark:border-neutral-800">
        <div className="mb-6 px-2">
          <p className="text-lg font-semibold">PicBed 后台</p>
          <p className="truncate text-xs opacity-60">{user.email}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logout}>
          <Button type="submit" variant="outline" fullWidth>
            退出登录
          </Button>
        </form>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
