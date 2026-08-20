import type { Metadata } from "next";

import MapView from "@/components/site/map-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "照片地图" };

export default function MapPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">照片足迹地图</h1>
      <MapView />
    </div>
  );
}
