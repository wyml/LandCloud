"use client";

import { useState } from "react";
import { Button, Input } from "@heroui/react";
import type { TagWithCount } from "@/lib/types";
import { createTag, deleteTag, renameTag } from "@/server/actions/tags";
import { AlertDialog, useAlertDialog } from "@/components/shared/alert-dialog";

export function TagsManager({ tags }: { tags: TagWithCount[] }) {
  const [newTag, setNewTag] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const { dialog, showConfirm, closeDialog } = useAlertDialog();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">标签管理</h1>

      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (newTag.trim()) {
            await createTag(newTag);
            setNewTag("");
          }
        }}
      >
        <Input
          value={newTag}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTag(e.target.value)}
          placeholder="新标签名称"
          className="flex-1"
        />
        <Button type="submit" variant="primary">
          创建标签
        </Button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
              <th className="p-3">标签名</th>
              <th className="p-3">图片数</th>
              <th className="p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => (
              <tr key={tag.id} className="border-b border-neutral-100 dark:border-neutral-900">
                <td className="p-3">
                  {editingId === tag.id ? (
                    <Input
                      value={editingName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingName(e.target.value)}
                    />
                  ) : (
                    tag.name
                  )}
                </td>
                <td className="p-3">{tag.count}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {editingId === tag.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          onPress={async () => {
                            await renameTag(tag.id, editingName);
                            setEditingId(null);
                          }}
                        >
                          保存
                        </Button>
                        <Button size="sm" onPress={() => setEditingId(null)}>
                          取消
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onPress={() => {
                          setEditingId(tag.id);
                          setEditingName(tag.name);
                        }}
                      >
                        重命名
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      onPress={() => {
                        showConfirm("确认删除", `删除标签「${tag.name}」？将解除与图片的关联。`, async () => {
                          await deleteTag(tag.id);
                        });
                      }}
                    >
                      删除
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {tags.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center opacity-60">
                  暂无标签
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
