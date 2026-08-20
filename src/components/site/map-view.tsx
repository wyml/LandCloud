"use client";

import dynamic from "next/dynamic";

const CesiumMap = dynamic(() => import("./cesium-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center text-sm opacity-60">地图加载中…</div>
  ),
});

export default function MapView() {
  return <CesiumMap />;
}
