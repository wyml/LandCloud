import { describe, expect, it } from "vitest";

import {
  grantShareCookieValue,
  hashAlbumPassword,
  hashSharePassword,
  hasShareGrant,
  readAlbumAccess,
  signAlbumAccess,
  signShareToken,
  verifyAlbumPassword,
  verifySharePassword,
  verifyShareToken,
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

describe("share password hashing", () => {
  it("verifies and scopes to share id", () => {
    const hash = hashSharePassword("pw", "share-1");
    expect(verifySharePassword("pw", "share-1", hash)).toBe(true);
    expect(verifySharePassword("pw", "share-2", hash)).toBe(false);
    expect(verifySharePassword("bad", "share-1", hash)).toBe(false);
  });
});

describe("share access token", () => {
  it("round-trips a valid token", () => {
    const token = signShareToken("share-1", 3600);
    expect(verifyShareToken(token)).toBe("share-1");
  });

  it("rejects expired tokens", () => {
    const token = signShareToken("share-1", -10);
    expect(verifyShareToken(token)).toBeNull();
  });

  it("rejects garbage and tampered tokens", () => {
    expect(verifyShareToken(undefined)).toBeNull();
    expect(verifyShareToken("a.b.c")).toBeNull();
    const token = signShareToken("share-1", 3600);
    const [payload] = token.split(".");
    expect(verifyShareToken(`${payload}.bad`)).toBeNull();
  });

  it("grants, dedupes, and checks share access", () => {
    let cookie = grantShareCookieValue(undefined, "share-1");
    expect(hasShareGrant(cookie, "share-1")).toBe(true);
    cookie = grantShareCookieValue(cookie, "share-1");
    expect(cookie.split(",").length).toBe(1);
    cookie = grantShareCookieValue(cookie, "share-2");
    expect(cookie.split(",").length).toBe(2);
    expect(hasShareGrant(cookie, "share-2")).toBe(true);
    expect(hasShareGrant("garbage", "share-1")).toBe(false);
  });
});
