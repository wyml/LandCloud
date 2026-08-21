/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Home, Images, Tag, Globe, Search } from "lucide-react";

import type { SiteSettings } from "@/lib/types";
import { ThemeToggle } from "./theme-toggle";

const NAV_ITEMS = [
  { href: "/", label: "首页", icon: Home },
  { href: "/albums", label: "相册", icon: Images },
  { href: "/tags", label: "标签", icon: Tag },
  { href: "/map", label: "地图", icon: Globe },
  { href: "/search", label: "搜索", icon: Search },
];

export function SiteHeader({ settings }: { settings: SiteSettings }) {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-black/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold">
          {settings.logo ? (
            <img src={settings.logo} alt="" className="h-7 w-7 rounded object-cover" />
          ) : null}
          <span className="truncate">{settings.name}</span>
        </Link>
        <nav className="flex flex-1 items-center justify-end gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm opacity-70 transition-colors hover:bg-neutral-100 hover:opacity-100 dark:hover:bg-neutral-800"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
