"use client";

import dynamic from "next/dynamic";

const CesiumMap = dynamic(() => import("./cesium-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100svh-56px)] items-center justify-center bg-black text-sm text-white/60">
      地球加载中…
    </div>
  ),
});

export default function MapView() {
  return <CesiumMap />;
}
