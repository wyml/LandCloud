"use client";

import { useEffect } from "react";

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-6xl font-bold opacity-80">500</p>
      <h1 className="text-xl font-semibold">出错了</h1>
      <p className="max-w-md text-sm opacity-60">
        页面渲染过程中发生错误。请重试，若问题持续请联系管理员。
      </p>
      {error.digest ? <p className="text-xs opacity-40">错误编号：{error.digest}</p> : null}
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white transition-colors hover:bg-neutral-700 dark:bg-neutral-100 dark:text-black dark:hover:bg-neutral-300"
      >
        重试
      </button>
    </main>
  );
}
