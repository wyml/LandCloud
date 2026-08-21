/* eslint-disable @next/next/no-img-element */
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.6);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const transparent = isHome && !scrolled;

  return (
    <header
      className={`sticky top-0 z-30 transition-colors duration-300 ${
        transparent
          ? "bg-transparent text-white"
          : "border-b border-neutral-200/60 bg-white/70 backdrop-blur-xl dark:border-neutral-800/60 dark:bg-black/50"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-x-4 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold">
          {settings.logo ? (
            <img src={settings.logo} alt="" className="h-7 w-7 rounded-lg object-cover" />
          ) : null}
          <span className="truncate">{settings.name}</span>
        </Link>
        <nav className="flex flex-1 items-center justify-end gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  transparent
                    ? isActive
                      ? "text-white"
                      : "opacity-70 hover:bg-white/10 hover:opacity-100"
                    : isActive
                      ? "text-[var(--accent)]"
                      : "opacity-60 hover:bg-neutral-100 hover:opacity-100 dark:hover:bg-neutral-800"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-x-2 -bottom-[9px] h-0.5 rounded-full bg-[var(--accent)]"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </Link>
            );
          })}
          <div className="ml-1">
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
