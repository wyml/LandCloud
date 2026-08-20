import { NextResponse } from "next/server";

import { getMapPhotos } from "@/server/queries/public";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getMapPhotos();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ photos: [], locatedCount: 0, footprintCount: 0 }, { status: 200 });
  }
}
