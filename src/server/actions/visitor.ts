"use server";

import { refresh } from "next/cache";
import { cookies, headers } from "next/headers";

import { checkRateLimit } from "@/lib/rate-limit";
import {
  grantShareCookieValue,
  readAlbumAccess,
  signAlbumAccess,
  verifyAlbumPassword,
  verifySharePassword,
  verifyShareToken,
} from "@/lib/security";
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

export async function submitSharePassword(
  shareId: string,
  password: string,
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { data: share } = await admin
    .from("shares")
    .select("id, password_hash, revoked, expires_at")
    .eq("id", shareId)
    .maybeSingle();
  if (!share || share.revoked) return { error: "分享不存在或已撤销" };
  if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) {
    return { error: "分享已过期" };
  }

  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip") ??
    "unknown";
  const allowed = await checkRateLimit(`share:${shareId}:${ip}`, 5, 60);
  if (!allowed) return { error: "尝试次数过多，请 1 分钟后再试" };

  const storedHash = share.password_hash as string;
  if (storedHash) {
    if (!verifySharePassword(password, shareId, storedHash)) {
      return { error: "密码错误" };
    }
  }

  const cookieStore = await cookies();
  cookieStore.set(
    "share_access",
    grantShareCookieValue(cookieStore.get("share_access")?.value, shareId),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    },
  );
  refresh();
  return {};
}

export async function readGrantedShareIds(): Promise<string[]> {
  const cookieStore = await cookies();
  const value = cookieStore.get("share_access")?.value ?? "";
  return value
    .split(",")
    .filter(Boolean)
    .map((token) => verifyShareToken(token))
    .filter((id): id is string => id !== null);
}
