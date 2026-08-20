import { describe, expect, it } from "vitest";
import {
  detectMimeByMagic,
  imagePrefix,
  isAcceptedMime,
  variantKey,
  variantsPrefix,
} from "@/lib/images/variants";

describe("detectMimeByMagic", () => {
  it("detects JPEG", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(detectMimeByMagic(buf)).toBe("image/jpeg");
  });

  it("detects PNG", () => {
    const buf = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(detectMimeByMagic(buf)).toBe("image/png");
  });

  it("detects GIF89a", () => {
    const buf = Buffer.concat([Buffer.from("GIF89a", "ascii"), Buffer.alloc(16)]);
    expect(detectMimeByMagic(buf)).toBe("image/gif");
  });

  it("detects WEBP", () => {
    const buf = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from("WEBP", "ascii"),
      Buffer.alloc(8),
    ]);
    expect(detectMimeByMagic(buf)).toBe("image/webp");
  });

  it("detects AVIF", () => {
    const buf = Buffer.concat([
      Buffer.from([0, 0, 0, 32]),
      Buffer.from("ftypavif", "ascii"),
      Buffer.alloc(8),
    ]);
    expect(detectMimeByMagic(buf)).toBe("image/avif");
  });

  it("detects SVG", () => {
    const buf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(detectMimeByMagic(buf)).toBe("image/svg+xml");
  });

  it("returns null for unknown bytes", () => {
    expect(detectMimeByMagic(Buffer.alloc(32))).toBeNull();
  });

  it("returns null for tiny buffer", () => {
    expect(detectMimeByMagic(Buffer.from([0xff]))).toBeNull();
  });
});

describe("isAcceptedMime", () => {
  it("accepts whitelisted mimes", () => {
    expect(isAcceptedMime("image/jpeg")).toBe(true);
    expect(isAcceptedMime("image/svg+xml")).toBe(true);
  });

  it("rejects others", () => {
    expect(isAcceptedMime("image/bmp")).toBe(false);
    expect(isAcceptedMime("application/pdf")).toBe(false);
  });
});

describe("key helpers", () => {
  it("builds image prefix with UTC month", () => {
    const date = new Date(Date.UTC(2026, 7, 20));
    expect(imagePrefix("abc", date)).toBe("images/2026/08/abc");
  });

  it("builds variant keys in same directory", () => {
    const key = "images/2026/08/abc/original.jpg";
    expect(variantKey(key, "display", "webp")).toBe("images/2026/08/abc/display.webp");
    expect(variantKey(key, "thumb_sm", "webp")).toBe("images/2026/08/abc/thumb_sm.webp");
    expect(variantsPrefix(key)).toBe("images/2026/08/abc/");
  });
});
