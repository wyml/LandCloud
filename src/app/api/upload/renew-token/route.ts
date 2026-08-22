import { NextResponse } from "next/server";
import { signUploadToken, verifyUploadToken } from "@/lib/security";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = body?.token;
  if (typeof token !== "string" || !verifyUploadToken(token)) {
    return NextResponse.json({ error: "无效或已过期的token" }, { status: 401 });
  }
  const renewed = signUploadToken();
  return NextResponse.json(renewed);
}
