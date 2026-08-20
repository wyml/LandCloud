import { test } from "@playwright/test";

/** E2E 依赖一套可用的环境（Supabase + S3 + 管理员账号）。未配置则跳过。 */
export const adminEmail = process.env.E2E_ADMIN_EMAIL;
export const adminPassword = process.env.E2E_ADMIN_PASSWORD;
export const e2eEnabled = Boolean(adminEmail && adminPassword);

export function requireE2E() {
  test.skip(!e2eEnabled, "未配置 E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD，跳过 E2E（本地无需运行）。");
}

/** 1x1 透明 PNG 字节，作为上传测试素材。 */
export const PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}
