"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type MapPhoto = { id: string; title: string; lat: number; lng: number; taken_at: string | null };
type MapData = { photos: MapPhoto[]; locatedCount: number; footprintCount: number };
type CesiumNS = typeof import("cesium");

interface TooltipPhoto {
  id: string;
  title: string;
}

interface TooltipState {
  x: number;
  y: number;
  photos: TooltipPhoto[];
  isCluster: boolean;
}

function loadCesiumAssets(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as unknown as { Cesium?: unknown }).Cesium) {
      resolve();
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/cesium/widgets.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "/cesium/Cesium.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Cesium.js 加载失败"));
    document.head.appendChild(script);
  });
}

function extractPhotos(entity: unknown): TooltipPhoto[] {
  const e = entity as {
    cluster?: { clusteredEntities?: Array<{ id: string; properties?: { getValue?: (t?: unknown) => { imageId?: string; title?: string } } }> };
    id?: string;
    properties?: { getValue?: (t?: unknown) => { imageId?: string; title?: string } };
  };
  if (e.cluster?.clusteredEntities?.length) {
    return e.cluster.clusteredEntities.map((ce) => ({
      id: ce.id,
      title: ce.properties?.getValue?.()?.title ?? "",
    }));
  }
  const props = e.properties?.getValue?.();
  if (props?.imageId) {
    return [{ id: props.imageId, title: props.title ?? "" }];
  }
  return [];
}

export default function CesiumMap() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stats, setStats] = useState<MapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const tooltipRef = useRef<TooltipState | null>(null);
  const viewerRef = useRef<InstanceType<CesiumNS["Viewer"]> | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncTooltip = useCallback((state: TooltipState | null) => {
    tooltipRef.current = state;
    setTooltip(state);
  }, []);

  useEffect(() => {
    let destroyed = false;

    async function init() {
      try {
        const res = await fetch("/api/map/photos");
        if (!res.ok) throw new Error("地图数据加载失败");
        const data = (await res.json()) as MapData;
        if (destroyed) return;
        setStats(data);

        (window as unknown as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = "/cesium";
        await loadCesiumAssets();
        if (destroyed) return;

        const Cesium = (window as unknown as { Cesium: CesiumNS }).Cesium;
        if (!containerRef.current) return;

        const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
        const viewer = new Cesium.Viewer(containerRef.current, {
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
        viewerRef.current = viewer;

        viewer.scene.screenSpaceCameraController.minimumZoomDistance = 500;
        viewer.scene.screenSpaceCameraController.maximumZoomDistance = 100_000_000;

        const dataSource = new Cesium.CustomDataSource("photos");
        viewer.dataSources.add(dataSource);

        dataSource.clustering.enabled = true;
        dataSource.clustering.pixelRange = 40;
        dataSource.clustering.minimumClusterSize = 2;
        dataSource.clustering.clusterEvent.addEventListener(
          (
            clusteredEntities: unknown[],
            cluster: {
              point: InstanceType<CesiumNS["PointPrimitive"]>;
              label: InstanceType<CesiumNS["Label"]>;
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

        const photoMap = new Map<string, MapPhoto>();
        const positions: InstanceType<CesiumNS["Cartesian3"]>[] = [];
        for (const photo of data.photos) {
          const position = Cesium.Cartesian3.fromDegrees(photo.lng, photo.lat);
          positions.push(position);
          photoMap.set(photo.id, photo);
          dataSource.entities.add({
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
            properties: { imageId: photo.id, title: photo.title },
          });
        }

        function showTooltip(entity: unknown, screenPos: { x: number; y: number }) {
          const photos = extractPhotos(entity);
          if (photos.length === 0) {
            syncTooltip(null);
            return;
          }
          const isCluster = !!(entity as { cluster?: unknown }).cluster;
          syncTooltip({
            x: screenPos.x,
            y: screenPos.y,
            photos,
            isCluster,
          });
        }

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

        handler.setInputAction(
          (movement: { endPosition: InstanceType<CesiumNS["Cartesian2"]> }) => {
            if (tooltipRef.current) return;
            const picked = viewer.scene.pick(movement.endPosition);
            if (!picked || !picked.id) return;
            const entity = picked.id;
            if (entity.cluster?.clusteredEntities?.length || entity.properties?.getValue?.()?.imageId) {
              if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
              hoverTimerRef.current = setTimeout(() => {
                showTooltip(entity, { x: movement.endPosition.x, y: movement.endPosition.y });
              }, 200);
            }
          },
          Cesium.ScreenSpaceEventType.MOUSE_MOVE,
        );

        handler.setInputAction(
          (movement: { position: InstanceType<CesiumNS["Cartesian2"]> }) => {
            if (hoverTimerRef.current) {
              clearTimeout(hoverTimerRef.current);
              hoverTimerRef.current = null;
            }
            const picked = viewer.scene.pick(movement.position);
            if (!picked || !picked.id) {
              syncTooltip(null);
              return;
            }
            const entity = picked.id;
            const cluster = entity.cluster;
            if (cluster?.clusteredEntities?.length) {
              showTooltip(entity, { x: movement.position.x, y: movement.position.y });
              const points = cluster.clusteredEntities
                .map((e: { position?: { getValue?: (t: unknown) => InstanceType<CesiumNS["Cartesian3"]> } }) =>
                  e.position?.getValue?.(Cesium.JulianDate.now()),
                )
                .filter(Boolean) as InstanceType<CesiumNS["Cartesian3"]>[];
              if (points.length > 0) {
                const sphere = Cesium.BoundingSphere.fromPoints(points);
                viewer.camera.flyToBoundingSphere(sphere, { duration: 1 });
              }
              return;
            }
            const props = entity.properties?.getValue?.(Cesium.JulianDate.now());
            if (props?.imageId) {
              showTooltip(entity, { x: movement.position.x, y: movement.position.y });
            }
          },
          Cesium.ScreenSpaceEventType.LEFT_CLICK,
        );

        viewer.scene.postRender.addEventListener(() => {
          const current = tooltipRef.current;
          if (!current || current.photos.length === 0) return;
          const firstPhoto = current.photos[0];
          const photo = photoMap.get(firstPhoto.id);
          if (!photo) return;
          const worldPos = Cesium.Cartesian3.fromDegrees(photo.lng, photo.lat);
          const canvasPos = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, worldPos);
          if (canvasPos) {
            const newX = Math.round(canvasPos.x);
            const newY = Math.round(canvasPos.y);
            if (Math.abs(newX - current.x) > 1 || Math.abs(newY - current.y) > 1) {
              syncTooltip({ ...current, x: newX, y: newY });
            }
          }
        });

        viewer.camera.changed.addEventListener(() => {
          syncTooltip(null);
        });

        if (positions.length > 0) {
          const sphere = Cesium.BoundingSphere.fromPoints(positions);
          const radius = Math.max(sphere.radius, 50_000);
          viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(sphere.center, radius), {
            duration: 1.5,
          });
        }

        if (destroyed) {
          viewer.destroy();
        }
      } catch (e) {
        if (!destroyed) setError((e as Error).message || "地图加载失败");
      }
    }

    void init();

    return () => {
      destroyed = true;
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, [router, syncTooltip]);

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

      {tooltip && tooltip.photos.length > 0 && (
        <div
          className="pointer-events-auto absolute z-20"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%) translateY(-14px)",
          }}
        >
          <div
            className="w-[300px] max-h-[220px] overflow-hidden rounded-xl border border-neutral-200 bg-white/95 shadow-2xl backdrop-blur-md dark:border-neutral-700 dark:bg-neutral-900/95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-1.5 dark:border-neutral-800">
              <span className="text-xs font-medium opacity-70">
                {tooltip.isCluster
                  ? `${tooltip.photos.length} 张照片`
                  : tooltip.photos[0]?.title || "照片"}
              </span>
              <button
                type="button"
                onClick={() => syncTooltip(null)}
                className="text-xs opacity-40 hover:opacity-100"
              >
                ✕
              </button>
            </div>
            <div className="grid max-h-[170px] grid-cols-3 gap-1 overflow-y-auto p-2">
              {tooltip.photos.slice(0, 12).map((photo) => (
                <Link
                  key={photo.id}
                  href={`/images/${photo.id}`}
                  className="group aspect-square overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/f/${photo.id}/thumb_sm`}
                    alt={photo.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                </Link>
              ))}
            </div>
            {tooltip.photos.length > 12 && (
              <p className="border-t border-neutral-100 px-3 py-1 text-center text-[10px] opacity-40 dark:border-neutral-800">
                还有 {tooltip.photos.length - 12} 张…
              </p>
            )}
          </div>
          {/* Arrow pointer */}
          <div className="flex justify-center">
            <div className="h-2 w-4 -translate-y-px rotate-180 overflow-hidden">
              <div className="h-3 w-3 translate-x-[3px] translate-y-[-4px] rotate-45 border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900" />
            </div>
          </div>
        </div>
      )}

      <p className="mt-2 text-center text-xs opacity-50">
        桌面端悬停查看预览，点击聚合圆缩放展开；点击图片查看详情
      </p>
    </div>
  );
}
