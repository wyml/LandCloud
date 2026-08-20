"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";

import { readAlbumAccess, signAlbumAccess, verifyAlbumPassword } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";

export async function submitAlbumPassword(
  albumId: string,
  password: string,
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { data: album } = await admin
    .from("albums")
    .select("visibility, password_hash")
    .eq("id", albumId)
    .maybeSingle();
  if (!album || album.visibility !== "password") {
    return { error: "相册不存在或无需密码" };
  }
  if (!verifyAlbumPassword(password, albumId, album.password_hash as string)) {
    return { error: "密码错误" };
  }
  const cookieStore = await cookies();
  const granted = readAlbumAccess(cookieStore.get("album_access")?.value);
  const next = [...new Set([...granted, albumId])];
  cookieStore.set("album_access", signAlbumAccess(next), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  refresh();
  return {};
}
