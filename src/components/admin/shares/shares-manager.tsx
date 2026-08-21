"use client";

import { useState } from "react";
import { Button, Input } from "@heroui/react";
import type { ShareListItem } from "@/server/queries/shares";
import { createShare, deleteShare, toggleShareRevoked } from "@/server/actions/shares";
import { AppSelect } from "@/components/shared/app-select";
import { AlertDialog, useAlertDialog } from "@/components/shared/alert-dialog";

interface SharesManagerProps {
  shares: ShareListItem[];
  albums: Array<{ id: string; name: string }>;
  images: Array<{ id: string; name: string }>;
  now: number;
}

export function SharesManager({ shares, albums, images, now }: SharesManagerProps) {
  const [targetType, setTargetType] = useState<"album" | "image">("album");
  const [targetId, setTargetId] = useState("");
  const [password, setPassword] = useState("");
  const [expiresHours, setExpiresHours] = useState("168");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dialog, showConfirm, closeDialog } = useAlertDialog();

  const targets = targetType === "album" ? albums : images;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetId) {
      setError("请选择分享目标");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createShare({
        targetType,
        targetId,
        password,
        expiresHours: Number(expiresHours) || null,
      });
      setPassword("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">分享管理</h1>

      <form
        onSubmit={submit}
        className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
      >
        <h2 className="text-sm font-semibold">创建分享</h2>
        <div className="flex flex-wrap gap-3">
          <AppSelect
            value={targetType}
            onChange={(v) => {
              setTargetType(v as "album" | "image");
              setTargetId("");
            }}
            options={[
              { value: "album", label: "相册" },
              { value: "image", label: "单张图片" },
            ]}
            ariaLabel="分享目标类型"
          />
          <AppSelect
            value={targetId}
            onChange={setTargetId}
            options={[
              { value: "", label: `请选择${targetType === "album" ? "相册" : "图片"}` },
              ...targets.map((t) => ({ value: t.id, label: t.name })),
            ]}
            ariaLabel="选择分享目标"
            className="flex-1"
            fullWidth
          />
          <Input
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            placeholder="访问密码（留空表示免密）"
            className="flex-1"
          />
          <AppSelect
            value={expiresHours}
            onChange={setExpiresHours}
            options={[
              { value: "24", label: "24 小时" },
              { value: "168", label: "7 天" },
              { value: "720", label: "30 天" },
              { value: "0", label: "永不过期" },
            ]}
            ariaLabel="有效期"
          />
          <Button type="submit" variant="primary" isDisabled={saving}>
            {saving ? "创建中…" : "创建分享"}
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left">
            <tr>
              <th className="px-3 py-2">类型</th>
              <th className="px-3 py-2">目标</th>
              <th className="px-3 py-2">密码</th>
              <th className="px-3 py-2">有效期</th>
              <th className="px-3 py-2">浏览量</th>
              <th className="px-3 py-2">状态</th>
              <th className="px-3 py-2">链接</th>
              <th className="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {shares.map((share) => {
              const expired =
                share.expires_at !== null && new Date(share.expires_at).getTime() < now;
              return (
                <tr key={share.id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="px-3 py-2">{share.target_type === "album" ? "相册" : "图片"}</td>
                  <td className="max-w-40 truncate px-3 py-2">{share.target_name}</td>
                  <td className="px-3 py-2">{share.has_password ? "有" : "无"}</td>
                  <td className="px-3 py-2">
                    {share.expires_at
                      ? `${new Date(share.expires_at).toLocaleString("zh-CN")}${expired ? "（已过期）" : ""}`
                      : "永久"}
                  </td>
                  <td className="px-3 py-2">{share.view_count}</td>
                  <td className="px-3 py-2">
                    {share.revoked ? (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-900/40">
                        已撤销
                      </span>
                    ) : expired ? (
                      <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs dark:bg-neutral-800">
                        已过期
                      </span>
                    ) : (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700 dark:bg-green-900/40">
                        有效
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <a
                      href={`/s/${share.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="opacity-70 hover:underline"
                    >
                      /s/{share.id.slice(0, 8)}
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      <Button size="sm" onPress={() => void toggleShareRevoked(share.id)}>
                        {share.revoked ? "恢复" : "撤销"}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onPress={() => {
                          showConfirm("确认删除", "确认删除该分享？", async () => {
                            await deleteShare(share.id);
                          });
                        }}
                      >
                        删除
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {shares.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center opacity-60">
                  暂无分享
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AlertDialog
        open={dialog.open}
        onClose={closeDialog}
        title={dialog.title}
        message={dialog.message}
        confirmLabel={dialog.confirmLabel}
        onConfirm={dialog.onConfirm}
        showCancel={dialog.showCancel}
      />
    </div>
  );
}
