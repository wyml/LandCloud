import crypto from "node:crypto";

function sessionSecret(): string {
  return process.env.SESSION_SECRET ?? "dev-insecure-session-secret-do-not-use-in-prod";
}

export function hashAlbumPassword(password: string, albumId: string): string {
  return crypto.scryptSync(password, `picbed-album-${albumId}`, 64).toString("hex");
}

export function verifyAlbumPassword(
  password: string,
  albumId: string,
  storedHash: string,
): boolean {
  if (!storedHash) return false;
  const actual = Buffer.from(hashAlbumPassword(password, albumId), "hex");
  const expected = Buffer.from(storedHash, "hex");
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

export function hashSharePassword(password: string, shareId: string): string {
  return crypto.scryptSync(password, `picbed-share-${shareId}`, 64).toString("hex");
}

export function verifySharePassword(
  password: string,
  shareId: string,
  storedHash: string,
): boolean {
  if (!storedHash) return false;
  const actual = Buffer.from(hashSharePassword(password, shareId), "hex");
  const expected = Buffer.from(storedHash, "hex");
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

export function signAlbumAccess(albumIds: string[]): string {
  const payload = Buffer.from(JSON.stringify({ albums: [...albumIds].sort() })).toString(
    "base64url",
  );
  const sig = crypto.createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readAlbumAccess(token: string | undefined): string[] {
  if (!token) return [];
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return [];
  const expected = crypto.createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  const actual = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (actual.length !== expectedBuf.length) return [];
  if (!crypto.timingSafeEqual(actual, expectedBuf)) return [];
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      albums?: string[];
    };
    return Array.isArray(parsed.albums) ? parsed.albums : [];
  } catch {
    return [];
  }
}

export function signShareToken(shareId: string, ttlSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = Buffer.from(JSON.stringify({ s: shareId, exp })).toString("base64url");
  const sig = crypto.createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyShareToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = crypto.createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  const actual = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (actual.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(actual, expectedBuf)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      s?: string;
      exp?: number;
    };
    if (typeof parsed.s !== "string" || typeof parsed.exp !== "number") return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed.s;
  } catch {
    return null;
  }
}

export const SHARE_ACCESS_TTL_SECONDS = 60 * 60 * 24;

export function grantShareCookieValue(existing: string | undefined, shareId: string): string {
  const tokens = (existing ?? "").split(",").filter(Boolean);
  const kept = tokens.filter((token) => verifyShareToken(token) !== shareId);
  const newValue = [...kept, signShareToken(shareId, SHARE_ACCESS_TTL_SECONDS)].filter(Boolean);
  return newValue.join(",");
}

export function hasShareGrant(existing: string | undefined, shareId: string): boolean {
  if (!existing) return false;
  return existing
    .split(",")
    .filter(Boolean)
    .some((token) => verifyShareToken(token) === shareId);
}
