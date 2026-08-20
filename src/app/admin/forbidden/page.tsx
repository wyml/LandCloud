import Link from "next/link";

export default function AdminForbidden() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-6xl font-bold opacity-80">403</p>
      <h1 className="text-xl font-semibold">无权访问后台</h1>
      <p className="max-w-md text-sm opacity-60">
        当前账号不是管理员，无法进入后台。如需访问请使用管理员账号登录。
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
