import "server-only";

import { NextResponse } from "next/server";
import { getSessionUser, isAdminUser } from "@/lib/auth";
import { verifyUploadToken } from "@/lib/security";

export async function guardAdmin(): Promise<NextResponse | null> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export type UploadAccess =
  { ok: true; mode: "admin" } | { ok: true; mode: "token" } | { ok: false; response: NextResponse };

export async function guardUploadAccess(request: Request): Promise<UploadAccess> {
  const user = await getSessionUser();
  if (user && isAdminUser(user)) return { ok: true, mode: "admin" };
  if (verifyUploadToken(request.headers.get("x-upload-token") ?? undefined)) {
    return { ok: true, mode: "token" };
  }
  if (user) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
