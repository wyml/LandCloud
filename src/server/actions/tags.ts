"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createTag(name: string) {
  await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) return;
  const admin = createAdminClient();
  const { error } = await admin.from("tags").upsert({ name: trimmed }, { onConflict: "name" });
  if (error) throw new Error(error.message);
  refresh();
}

export async function renameTag(id: string, name: string) {
  await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) return;
  const admin = createAdminClient();
  const { error } = await admin.from("tags").update({ name: trimmed }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteTag(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("tags").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}
