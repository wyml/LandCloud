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
