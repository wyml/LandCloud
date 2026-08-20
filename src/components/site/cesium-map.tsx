"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type MapData = {
  photos: Array<{ id: string; title: string; lat: number; lng: number; taken_at: string | null }>;
  locatedCount: number;
  footprintCount: number;
};

type CesiumModule = typeof import("cesium");
type ViewerInstance = InstanceType<CesiumModule["Viewer"]>;
type Cart3 = InstanceType<CesiumModule["Cartesian3"]>;
type Cart2 = InstanceType<CesiumModule["Cartesian2"]>;
type JulianDate = InstanceType<CesiumModule["JulianDate"]>;

if (typeof window !== "undefined") {
  (window as unknown as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = "/cesium";
}

export default function CesiumMap() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stats, setStats] = useState<MapData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let viewer: ViewerInstance | null = null;
    let destroyed = false;

    async function init() {
      try {
        const res = await fetch("/api/map/photos");
        if (!res.ok) throw new Error("地图数据加载失败");
        const data = (await res.json()) as MapData;
        if (destroyed) return;
        setStats(data);

        const Cesium = await import("cesium");
        if (destroyed || !containerRef.current) return;

        const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
        viewer = new Cesium.Viewer(containerRef.current, {
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          creditContainer: document.createElement("div"),
          baseLayer: ionToken
            ? Cesium.ImageryLayer.fromWorldImagery({ token: ionToken } as Parameters<
                typeof Cesium.ImageryLayer.fromWorldImagery
              >[0])
            : new Cesium.ImageryLayer(
                new Cesium.OpenStreetMapImageryProvider({
                  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                  credit: "© OpenStreetMap contributors",
                }),
              ),
        });

        viewer.scene.screenSpaceCameraController.minimumZoomDistance = 500;
        viewer.scene.screenSpaceCameraController.maximumZoomDistance = 100_000_000;

        const positions: Cart3[] = [];
        for (const photo of data.photos) {
          const position = Cesium.Cartesian3.fromDegrees(photo.lng, photo.lat);
          positions.push(position);
          viewer.entities.add({
            id: photo.id,
            position,
            point: {
              pixelSize: 9,
              color: Cesium.Color.fromCssColorString("#ef4444"),
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
            label: {
              text: photo.title || "",
              show: false,
              font: "12px sans-serif",
              pixelOffset: new Cesium.Cartesian2(0, -18),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              outlineWidth: 3,
              outlineColor: Cesium.Color.BLACK,
            },
            properties: { imageId: photo.id },
          });
        }

        const clustering = (
          viewer.entities as unknown as { clustering: InstanceType<CesiumModule["EntityCluster"]> }
        ).clustering;
        clustering.enabled = true;
        clustering.pixelRange = 40;
        clustering.minimumClusterSize = 2;
        clustering.clusterEvent.addEventListener(
          (
            clusteredEntities: unknown[],
            cluster: {
              point: InstanceType<CesiumModule["PointPrimitive"]>;
              label: InstanceType<CesiumModule["Label"]>;
            },
          ) => {
            cluster.point.show = true;
            cluster.point.pixelSize = 30;
            cluster.point.color = Cesium.Color.fromCssColorString("#4f46e5");
            cluster.point.outlineColor = Cesium.Color.WHITE;
            cluster.point.outlineWidth = 2;
            cluster.label.show = true;
            cluster.label.text = String(clusteredEntities.length);
            cluster.label.font = "bold 13px sans-serif";
            cluster.label.fillColor = Cesium.Color.WHITE;
            cluster.label.pixelOffset = new Cesium.Cartesian2(0, -2);
          },
        );

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement: { position: Cart2 }) => {
          const picked = viewer?.scene.pick(movement.position);
          if (!picked || !picked.id) return;
          const entity = picked.id as unknown as {
            cluster?: {
              clusteredEntities?: Array<{
                position?: { getValue?: (time: JulianDate) => Cart3 };
              }>;
            };
            properties?: {
              getValue?: (time: JulianDate) => { imageId?: string };
            };
          };
          const cluster = entity.cluster;
          if (cluster?.clusteredEntities?.length) {
            const points = cluster.clusteredEntities
              .map((e) => e.position?.getValue?.(Cesium.JulianDate.now()))
              .filter(Boolean) as Cart3[];
            if (points.length > 0) {
              const sphere = Cesium.BoundingSphere.fromPoints(points);
              viewer?.camera.flyToBoundingSphere(sphere, { duration: 1 });
              return;
            }
          }
          const imageId = entity.properties?.getValue?.(Cesium.JulianDate.now())?.imageId;
          if (imageId) {
            router.push(`/images/${imageId}`);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        if (positions.length > 0) {
          const sphere = Cesium.BoundingSphere.fromPoints(positions);
          const radius = Math.max(sphere.radius, 50_000);
          viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(sphere.center, radius), {
            duration: 1.5,
          });
        }
      } catch (e) {
        if (!destroyed) setError((e as Error).message || "地图加载失败");
      }
    }

    void init();

    return () => {
      destroyed = true;
      if (viewer) {
        viewer.destroy();
        viewer = null;
      }
    };
  }, [router]);

  return (
    <div className="relative">
      {stats ? (
        <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
          <div className="rounded-lg bg-white/90 px-3 py-2 text-sm shadow dark:bg-black/70">
            <span className="font-semibold">{stats.locatedCount}</span> 张带位置照片
          </div>
          <div className="rounded-lg bg-white/90 px-3 py-2 text-sm shadow dark:bg-black/70">
            <span className="font-semibold">{stats.footprintCount}</span> 个足迹点位
          </div>
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-red-600">
          {error}
        </div>
      ) : null}
      <div ref={containerRef} className="h-[70vh] w-full overflow-hidden rounded-xl" />
      <p className="mt-2 text-center text-xs opacity-50">
        小屏设备可双指缩放 / 拖动；点击点位查看照片详情，点击聚合圆缩放展开
      </p>
    </div>
  );
}
