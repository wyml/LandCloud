import { describe, expect, it } from "vitest";
import {
  canAccessImage,
  proxyCacheControl,
  resolveVariantObject,
  type VariantObjectResolver,
} from "@/lib/images/access";

describe("canAccessImage", () => {
  it("公开图片允许访问", () => {
    expect(canAccessImage({ publiclyVisible: true, isAdmin: false, shareGranted: false, isHidden: false })).toBe(
      true,
    );
  });

  it("管理员可访问私密图片", () => {
    expect(canAccessImage({ publiclyVisible: false, isAdmin: true, shareGranted: false, isHidden: false })).toBe(
      true,
    );
  });

  it("分享授权可访问私密图片", () => {
    expect(canAccessImage({ publiclyVisible: false, isAdmin: false, shareGranted: true, isHidden: false })).toBe(
      true,
    );
  });

  it("隐藏图片可通过直链访问", () => {
    expect(canAccessImage({ publiclyVisible: false, isAdmin: false, shareGranted: false, isHidden: true })).toBe(
      true,
    );
  });

  it("无任何授权则拒绝", () => {
    expect(canAccessImage({ publiclyVisible: false, isAdmin: false, shareGranted: false, isHidden: false })).toBe(
      false,
    );
  });
});

describe("proxyCacheControl", () => {
  it("公开图片使用 1 年 immutable 缓存", () => {
    expect(proxyCacheControl(true)).toBe("public, max-age=31536000, immutable");
  });

  it("非公开图片一律 no-store", () => {
    expect(proxyCacheControl(false)).toBe("no-store");
  });
});

const makeResolver =
  (results: Record<string, boolean>): VariantObjectResolver =>
  async (name) =>
    (results[name] ? { size: 100 } : null) as { size: number } | null;

describe("resolveVariantObject", () => {
  it("变体存在时返回 WebP 变体 key 与 Content-Type", async () => {
    const result = await resolveVariantObject({
      s3Key: "images/2026/08/abc/thumb_lg.webp",
      mime: "image/jpeg",
      variant: "thumb_lg",
      resolver: makeResolver({ "images/2026/08/abc/thumb_lg.webp": true }),
    });
    expect(result).toEqual({
      key: "images/2026/08/abc/thumb_lg.webp",
      contentType: "image/webp",
    });
  });

  it("display 对 GIF 回退原图", async () => {
    const result = await resolveVariantObject({
      s3Key: "images/2026/08/abc/original.gif",
      mime: "image/gif",
      variant: "display",
      resolver: makeResolver({}),
    });
    expect(result).toEqual({ key: "images/2026/08/abc/original.gif", contentType: "image/gif" });
  });

  it("display 对 SVG 回退原图", async () => {
    const result = await resolveVariantObject({
      s3Key: "images/2026/08/abc/original.svg",
      mime: "image/svg+xml",
      variant: "display",
      resolver: makeResolver({}),
    });
    expect(result).toEqual({
      key: "images/2026/08/abc/original.svg",
      contentType: "image/svg+xml",
    });
  });

  it("普通图缺少变体时返回 null（404）", async () => {
    const result = await resolveVariantObject({
      s3Key: "images/2026/08/abc/original.jpg",
      mime: "image/jpeg",
      variant: "thumb_sm",
      resolver: makeResolver({}),
    });
    expect(result).toBeNull();
  });

  it("display 对普通图缺少变体时返回 null（404）", async () => {
    const result = await resolveVariantObject({
      s3Key: "images/2026/08/abc/original.jpg",
      mime: "image/jpeg",
      variant: "display",
      resolver: makeResolver({}),
    });
    expect(result).toBeNull();
  });
});
