"use server";

import QRCode from "qrcode";
import { requireAdmin } from "@/lib/auth";
import { getSiteUrl } from "@/lib/env";
import { signUploadToken } from "@/lib/security";

export async function createMobileUploadToken(): Promise<{
  url: string;
  token: string;
  expiresAt: number;
  qrDataUrl: string;
}> {
  await requireAdmin();
  const { token, expiresAt } = signUploadToken();
  const url = `${getSiteUrl()}/upload?token=${encodeURIComponent(token)}`;
  const qrDataUrl = await QRCode.toDataURL(url, {
    width: 256,
    margin: 1,
    errorCorrectionLevel: "M",
  });
  return { url, token, expiresAt, qrDataUrl };
}
