import { NextResponse } from "next/server";

import { isImagePubliclyVisible } from "@/server/queries/public";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let body: { type?: string; id?: string };
  try {
    body = (await request.json()) as { type?: string; id?: string };
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  if (
    !body ||
    (body.type !== "image" && body.type !== "album") ||
    typeof body.id !== "string" ||
    !UUID_RE.test(body.id)
  ) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const admin = createAdminClient();

  if (body.type === "image") {
    const { data: image } = await admin
      .from("images")
      .select("id, visibility, processing_status, view_count")
      .eq("id", body.id)
      .maybeSingle();
    if (!image || !(await isImagePubliclyVisible(image))) {
      return new NextResponse("Not found", { status: 404 });
    }
    await admin
      .from("images")
      .update({ view_count: (image.view_count ?? 0) + 1 })
      .eq("id", body.id);
    return new NextResponse(null, { status: 204 });
  }

  const { data: album } = await admin
    .from("albums")
    .select("id, visibility, view_count")
    .eq("id", body.id)
    .maybeSingle();
  if (!album || album.visibility !== "public") {
    return new NextResponse("Not found", { status: 404 });
  }
  await admin
    .from("albums")
    .update({ view_count: (album.view_count ?? 0) + 1 })
    .eq("id", body.id);
  return new NextResponse(null, { status: 204 });
}
