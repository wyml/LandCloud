import { describe, expect, it } from "vitest";

import {
  hashAlbumPassword,
  readAlbumAccess,
  signAlbumAccess,
  verifyAlbumPassword,
} from "./security";

describe("album password hashing", () => {
  it("verifies correct password", () => {
    const hash = hashAlbumPassword("secret", "album-1");
    expect(verifyAlbumPassword("secret", "album-1", hash)).toBe(true);
  });

  it("rejects wrong password", () => {
    const hash = hashAlbumPassword("secret", "album-1");
    expect(verifyAlbumPassword("wrong", "album-1", hash)).toBe(false);
  });

  it("scopes salt to album id", () => {
    const a = hashAlbumPassword("secret", "album-1");
    const b = hashAlbumPassword("secret", "album-2");
    expect(a).not.toBe(b);
  });

  it("rejects empty stored hash", () => {
    expect(verifyAlbumPassword("secret", "album-1", "")).toBe(false);
  });

  it("is deterministic per album", () => {
    expect(hashAlbumPassword("x", "album-1")).toBe(hashAlbumPassword("x", "album-1"));
  });
});

describe("album access cookie token", () => {
  it("round-trips granted ids", () => {
    const token = signAlbumAccess(["b", "a", "b"]);
    const ids = readAlbumAccess(token);
    expect(new Set(ids)).toEqual(new Set(["a", "b"]));
  });

  it("returns empty for garbage", () => {
    expect(readAlbumAccess(undefined)).toEqual([]);
    expect(readAlbumAccess("garbage")).toEqual([]);
    expect(readAlbumAccess("a.b")).toEqual([]);
  });

  it("rejects tampered signature", () => {
    const token = signAlbumAccess(["a"]);
    const [payload] = token.split(".");
    expect(readAlbumAccess(`${payload}.bad`)).toEqual([]);
  });
});
