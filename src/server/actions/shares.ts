"use server";

import { randomUUID } from "node:crypto";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { hashSharePassword } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createShare(input: {
  targetType: "album" | "image";
  targetId: string;
  password: string;
  expiresHours: number | null;
}) {
  await requireAdmin();
  const admin = createAdminClient();

  const table = input.targetType === "album" ? "albums" : "images";
  const { data: target } = await admin
    .from(table)
    .select("id")
    .eq("id", input.targetId)
    .maybeSingle();
  if (!target) throw new Error("目标不存在");

  const id = randomUUID();
  const passwordHash = input.password ? hashSharePassword(input.password, id) : "";
  const expiresAt =
    input.expiresHours && input.expiresHours > 0
      ? new Date(Date.now() + input.expiresHours * 3600 * 1000).toISOString()
      : null;

  const { error } = await admin.from("shares").insert({
    id,
    target_type: input.targetType,
    target_id: input.targetId,
    password_hash: passwordHash,
    expires_at: expiresAt,
  });
  if (error) throw new Error(error.message);
  refresh();
}

export async function toggleShareRevoked(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: share } = await admin.from("shares").select("revoked").eq("id", id).maybeSingle();
  if (!share) return;
  const { error } = await admin.from("shares").update({ revoked: !share.revoked }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteShare(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("shares").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}
