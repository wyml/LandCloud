import { NextResponse } from "next/server";
import { badRequest, guardAdmin, parseJsonBody } from "@/lib/api";
import { processImage } from "@/lib/images/processing";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const body = await parseJsonBody<{ imageId?: string }>(request);
  if (!body?.imageId) return badRequest("imageId 必填");

  const admin = createAdminClient();
  const { data: image } = await admin
    .from("images")
    .select("id, processing_status")
    .eq("id", body.imageId)
    .maybeSingle();
  if (!image) return badRequest("图片不存在");

  try {
    await processImage(image.id);
  } catch (error) {
    return NextResponse.json({ error: `处理失败: ${(error as Error).message}` }, { status: 500 });
  }

  const { data: finalImage } = await admin.from("images").select("*").eq("id", image.id).single();

  return NextResponse.json({ image: finalImage });
}
