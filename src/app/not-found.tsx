import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-6xl font-bold opacity-80">404</p>
      <h1 className="text-xl font-semibold">页面不存在</h1>
      <p className="max-w-md text-sm opacity-60">
        你访问的页面可能已被移动、删除，或没有访问权限。
      </p>
      <Link
        href="/"
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white transition-colors hover:bg-neutral-700 dark:bg-neutral-100 dark:text-black dark:hover:bg-neutral-300"
      >
        返回首页
      </Link>
    </main>
  );
}
