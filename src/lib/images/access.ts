import { variantKey, type Variant } from "@/lib/images/variants";

export interface AccessDecisionInput {
  /** Image-level public visibility (public + done, or member of a public album). */
  publiclyVisible: boolean;
  /** Whether the requester is the site administrator. */
  isAdmin: boolean;
  /** Whether a valid share grants access to this image directly or via its album. */
  shareGranted: boolean;
}

/** 代理路由访问决策：公开 > 管理员 > 分享授权；任一满足即可。 */
export function canAccessImage(input: AccessDecisionInput): boolean {
  return input.publiclyVisible || input.isAdmin || input.shareGranted;
}

/** 公开图片给 1 年 immutable 缓存；其余一律 no-store（含私密/加密）。 */
export function proxyCacheControl(publiclyVisible: boolean): string {
  return publiclyVisible ? "public, max-age=31536000, immutable" : "no-store";
}

export type VariantObjectResolver = (candidateKey: string) => Promise<{ size: number } | null>;

const MIME_BY_VARIANT: Record<string, string> = {
  display: "image/webp",
  thumb_lg: "image/webp",
  thumb_md: "image/webp",
  thumb_sm: "image/webp",
};

export interface VariantObjectInput {
  s3Key: string;
  mime: string;
  variant: Exclude<Variant, "original">;
  resolver: VariantObjectResolver;
}

export interface VariantObjectResult {
  key: string;
  contentType: string;
}

/**
 * 解析变体对象的存储 key 与 Content-Type。
 * - 变体存在则返回 WebP 变体；
 * - display 对 GIF/SVG 回退原图；
 * - 否则返回 null（404）。
 */
export async function resolveVariantObject(
  input: VariantObjectInput,
): Promise<VariantObjectResult | null> {
  const { s3Key, mime, variant, resolver } = input;
  const isGifOrSvg = mime === "image/gif" || mime === "image/svg+xml";

  const candidate = variantKey(s3Key, variant, "webp");
  const exists = await resolver(candidate);
  if (exists) {
    return { key: candidate, contentType: MIME_BY_VARIANT[variant] };
  }
  if (variant === "display" && isGifOrSvg) {
    return { key: s3Key, contentType: mime };
  }
  return null;
}
