"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function updateAdminEmail(input: {
  newEmail: string;
  currentPassword: string;
}) {
  const user = await requireAdmin();
  const email = input.newEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("请输入有效的邮箱地址");

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: input.currentPassword,
  });
  if (signInError) throw new Error("当前密码错误");

  const admin = createAdminClient();
  const { error } = await admin
    .from("app_config")
    .upsert({ key: "admin_email", value: email }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  refresh();
}

export async function updateProfile(input: {
  displayName: string;
  avatarUrl: string;
}) {
  const user = await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      display_name: input.displayName.trim(),
      avatar_url: input.avatarUrl.trim(),
    })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function updatePassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  const user = await requireAdmin();

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: input.currentPassword,
  });
  if (signInError) throw new Error("当前密码错误");

  const { error } = await supabase.auth.updateUser({
    password: input.newPassword,
  });
  if (error) throw new Error(error.message);
}
