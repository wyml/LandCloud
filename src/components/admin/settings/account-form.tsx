"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, FieldError, Form, Input, Label, TextField, toast } from "@heroui/react";
import { Check, X } from "lucide-react";
import { updateAdminEmail, updatePassword, updateProfile } from "@/server/actions/account";

interface AccountFormProps {
  currentEmail: string;
  profile: { displayName: string; avatarUrl: string };
  metadata: {
    createdAt: string;
    lastSignIn: string | null;
    emailConfirmed: boolean;
  };
}

export function AccountForm({ currentEmail, profile, metadata }: AccountFormProps) {
  const router = useRouter();

  const [emailForm, setEmailForm] = useState({ newEmail: "", currentPassword: "" });
  const [profileForm, setProfileForm] = useState(profile);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [savingEmail, setSavingEmail] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingEmail(true);
    try {
      await updateAdminEmail(emailForm);
      toast.success("管理员邮箱已更新，下次登录请使用新邮箱");
      setEmailForm({ newEmail: "", currentPassword: "" });
      router.refresh();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile(profileForm);
      toast.success("个人资料已保存");
      router.refresh();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.danger("两次输入的新密码不一致");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.danger("新密码至少 6 个字符");
      return;
    }
    setSavingPassword(true);
    try {
      await updatePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success("密码已更新");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      {/* 账户元数据 */}
      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">账户信息</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="opacity-60">注册时间</span>
            <p>{new Date(metadata.createdAt).toLocaleString("zh-CN")}</p>
          </div>
          <div>
            <span className="opacity-60">上次登录</span>
            <p>
              {metadata.lastSignIn
                ? new Date(metadata.lastSignIn).toLocaleString("zh-CN")
                : "无记录"}
            </p>
          </div>
          <div>
            <span className="opacity-60">邮箱验证</span>
            <p className="flex items-center gap-1">
              {metadata.emailConfirmed ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">已验证</span>
                </>
              ) : (
                <>
                  <X className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-600">未验证</span>
                </>
              )}
            </p>
          </div>
          <div>
            <span className="opacity-60">当前邮箱</span>
            <p className="truncate">{currentEmail}</p>
          </div>
        </div>
      </section>

      {/* 管理员邮箱 */}
      <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">管理员邮箱</h2>
        <p className="text-xs opacity-60">
          修改后下次登录将使用新邮箱。此邮箱用于后台身份验证，请谨慎修改。
        </p>
        <Form onSubmit={handleEmail} className="flex flex-col gap-4">
          <TextField
            name="newEmail"
            value={emailForm.newEmail}
            onChange={(v: string) => setEmailForm((s) => ({ ...s, newEmail: v }))}
            isRequired
            type="email"
          >
            <Label>新邮箱</Label>
            <Input placeholder="admin@example.com" />
            <FieldError />
          </TextField>
          <TextField
            name="currentPasswordEmail"
            value={emailForm.currentPassword}
            onChange={(v: string) => setEmailForm((s) => ({ ...s, currentPassword: v }))}
            isRequired
            type="password"
          >
            <Label>当前密码（确认修改）</Label>
            <Input autoComplete="current-password" />
            <FieldError />
          </TextField>
          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" isDisabled={savingEmail}>
              {savingEmail ? "保存中…" : "保存邮箱"}
            </Button>
          </div>
        </Form>
      </section>

      {/* 个人资料 */}
      <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">个人资料</h2>
        <Form onSubmit={handleProfile} className="flex flex-col gap-4">
          <TextField
            name="displayName"
            value={profileForm.displayName}
            onChange={(v: string) => setProfileForm((s) => ({ ...s, displayName: v }))}
          >
            <Label>显示名称</Label>
            <Input placeholder="管理员" />
            <FieldError />
          </TextField>
          <TextField
            name="avatarUrl"
            value={profileForm.avatarUrl}
            onChange={(v: string) => setProfileForm((s) => ({ ...s, avatarUrl: v }))}
          >
            <Label>头像 URL（可选）</Label>
            <Input placeholder="https://…/avatar.png" />
            <FieldError />
          </TextField>
          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" isDisabled={savingProfile}>
              {savingProfile ? "保存中…" : "保存资料"}
            </Button>
          </div>
        </Form>
      </section>

      {/* 修改密码 */}
      <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">修改密码</h2>
        <Form onSubmit={handlePassword} className="flex flex-col gap-4">
          <TextField
            name="currentPassword"
            value={passwordForm.currentPassword}
            onChange={(v: string) => setPasswordForm((s) => ({ ...s, currentPassword: v }))}
            isRequired
            type="password"
          >
            <Label>当前密码</Label>
            <Input autoComplete="current-password" />
            <FieldError />
          </TextField>
          <TextField
            name="newPassword"
            value={passwordForm.newPassword}
            onChange={(v: string) => setPasswordForm((s) => ({ ...s, newPassword: v }))}
            isRequired
            type="password"
            minLength={6}
          >
            <Label>新密码</Label>
            <Input autoComplete="new-password" />
            <FieldError />
          </TextField>
          <TextField
            name="confirmPassword"
            value={passwordForm.confirmPassword}
            onChange={(v: string) => setPasswordForm((s) => ({ ...s, confirmPassword: v }))}
            isRequired
            type="password"
          >
            <Label>确认新密码</Label>
            <Input autoComplete="new-password" />
            <FieldError />
          </TextField>
          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" isDisabled={savingPassword}>
              {savingPassword ? "保存中…" : "保存密码"}
            </Button>
          </div>
        </Form>
      </section>
    </div>
  );
}
