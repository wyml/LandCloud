"use client";

import { useState } from "react";

import { submitAlbumPassword } from "@/server/actions/visitor";

export function PasswordForm({ albumId }: { albumId: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitAlbumPassword(albumId, password);
      if (result.error) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex w-full max-w-sm flex-col gap-3 rounded-xl border border-neutral-200 p-6 dark:border-neutral-800"
    >
      <h2 className="text-center text-lg font-semibold">相册已加密</h2>
      <p className="text-center text-sm opacity-60">请输入访问密码</p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="访问密码"
        required
        className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 bg-white dark:bg-neutral-800"
      />
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {submitting ? "验证中…" : "进入相册"}
      </button>
    </form>
  );
}
