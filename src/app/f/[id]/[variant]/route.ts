import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth";
import { isImagePubliclyVisible } from "@/server/queries/public";
import { variantKey, type Variant } from "@/lib/images/variants";
import { getObjectBuffer, objectExists } from "@/lib/s3";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const VARIANT_SET = new Set<Variant>(["original", "display", "thumb_lg", "thumb_md", "thumb_sm"]);

const MIME_BY_VARIANT: Record<string, string> = {
  display: "image/webp",
  thumb_lg: "image/webp",
  thumb_md: "image/webp",
  thumb_sm: "image/webp",
};

export async function GET(_request: Request, { params }: RouteContext<"/f/[id]/[variant]">) {
  const { id, variant: variantParam } = await params;
  if (!VARIANT_SET.has(variantParam as Variant)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const variant = variantParam as Variant;

  const admin = createAdminClient();
  const { data: image } = await admin
    .from("images")
    .select("id, s3_key, mime, visibility, processing_status")
    .eq("id", id)
    .maybeSingle();
  if (!image) {
    return new NextResponse("Not found", { status: 404 });
  }

  const publiclyVisible = await isImagePubliclyVisible(image);

  let allowed = publiclyVisible;
  if (!allowed) {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getUser();
    allowed = isAdminUser(session.user);
  }
  if (!allowed) {
    return new NextResponse("Not found", { status: 404 });
  }

  let key: string;
  let contentType: string;

  if (variant === "original") {
    key = image.s3_key;
    contentType = image.mime;
  } else {
    const isGifOrSvg = image.mime === "image/gif" || image.mime === "image/svg+xml";
    const candidate = variantKey(image.s3_key, variant, "webp");
    const exists = await objectExists(candidate);
    if (exists) {
      key = candidate;
      contentType = MIME_BY_VARIANT[variant];
    } else if (variant === "display" && isGifOrSvg) {
      key = image.s3_key;
      contentType = image.mime;
    } else {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  try {
    const buffer = await getObjectBuffer(key);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": publiclyVisible ? "public, max-age=31536000, immutable" : "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
