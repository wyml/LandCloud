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
  anchorLng: number;
  anchorLat: number;
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

type ClusterLike = {
  clusteredEntities?: Array<{
    id: string;
    position?: { getValue?: (t: unknown) => InstanceType<CesiumNS["Cartesian3"]> };
    properties?: { getValue?: (t?: unknown) => { imageId?: string; title?: string } };
  }>;
};
type EntityLike = {
  id?: string;
  cluster?: ClusterLike;
  clusteredEntities?: ClusterLike["clusteredEntities"];
  properties?: { getValue?: (t?: unknown) => { imageId?: string; title?: string } };
};

function getClusteredEntities(entity: unknown): ClusterLike["clusteredEntities"] {
  const e = entity as EntityLike;
  if (e.cluster?.clusteredEntities?.length) return e.cluster.clusteredEntities;
  if (e.clusteredEntities?.length) return e.clusteredEntities;
  return undefined;
}

function extractPhotos(entity: unknown, photoMap: Map<string, MapPhoto>): TooltipPhoto[] {
  const e = entity as EntityLike;
  const clustered = getClusteredEntities(entity);
  if (clustered?.length) {
    const photos: TooltipPhoto[] = [];
    for (const ce of clustered) {
      // Try by entity ID
      let photo = photoMap.get(ce.id ?? "");
      // Fallback: try by properties.imageId
      if (!photo) {
        const props = ce.properties?.getValue?.();
        if (props?.imageId) photo = photoMap.get(props.imageId);
      }
      if (photo) {
        photos.push({ id: photo.id, title: photo.title });
      } else if (ce.id) {
        photos.push({ id: ce.id, title: ce.properties?.getValue?.()?.title ?? "" });
      }
    }
    return photos;
  }
  const props = e.properties?.getValue?.();
  if (props?.imageId) {
    return [{ id: props.imageId, title: props.title ?? "" }];
  }
  return [];
}

function getPickedEntity(picked: unknown): unknown {
  if (!picked) return null;
  const p = picked as Record<string, unknown>;

  // Direct cluster (picked object itself has clusteredEntities)
  if (Array.isArray(p.clusteredEntities) && p.clusteredEntities.length > 0) return p;

  // Entity with cluster sub-object
  const id = p.id as Record<string, unknown> | undefined;
  if (id) {
    if (Array.isArray(id.clusteredEntities) && id.clusteredEntities.length > 0) return id;
    if (id.cluster && Array.isArray((id.cluster as Record<string, unknown>).clusteredEntities)) return id;
    if (typeof id === "object" && "properties" in id) return id;
  }

  // Primitive level pick
  const primitive = p.primitive as Record<string, unknown> | undefined;
  if (primitive?.id) {
    const pid = primitive.id as Record<string, unknown>;
    if (Array.isArray(pid.clusteredEntities) && pid.clusteredEntities.length > 0) return pid;
    if (pid.cluster && Array.isArray((pid.cluster as Record<string, unknown>).clusteredEntities)) return pid;
    if (typeof pid === "object" && "properties" in pid) return pid;
  }

  return null;
}

function isInteractive(entity: unknown, photoMap: Map<string, MapPhoto>): boolean {
  return extractPhotos(entity, photoMap).length > 0;
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

        viewer.resolutionScale = window.devicePixelRatio;
        viewer.scene.globe.maximumScreenSpaceError = 1.5;
        viewer.scene.backgroundColor = Cesium.Color.BLACK;
        if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = false;
        viewer.scene.globe.showGroundAtmosphere = false;
        viewer.scene.fog.enabled = false;

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
          const photos = extractPhotos(entity, photoMap);
          if (photos.length === 0) {
            syncTooltip(null);
            return;
          }
          const clustered = getClusteredEntities(entity);
          const isCluster = !!clustered;
          let anchorLng = 0;
          let anchorLat = 0;
          if (isCluster && clustered) {
            let sumLng = 0;
            let sumLat = 0;
            let count = 0;
            for (const ce of clustered) {
              const p = photoMap.get(ce.id);
              if (p) {
                sumLng += p.lng;
                sumLat += p.lat;
                count++;
              }
            }
            if (count > 0) {
              anchorLng = sumLng / count;
              anchorLat = sumLat / count;
            }
          } else {
            const props = (entity as EntityLike).properties?.getValue?.();
            if (props?.imageId) {
              const p = photoMap.get(props.imageId);
              if (p) {
                anchorLng = p.lng;
                anchorLat = p.lat;
              }
            }
          }
          syncTooltip({
            x: screenPos.x,
            y: screenPos.y,
            photos,
            isCluster,
            anchorLng,
            anchorLat,
          });
        }

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

        handler.setInputAction(
          (movement: { endPosition: InstanceType<CesiumNS["Cartesian2"]> }) => {
            const picked = viewer.scene.pick(movement.endPosition);
            const entity = getPickedEntity(picked);
            if (!entity || !isInteractive(entity, photoMap)) {
              if (hoverTimerRef.current) {
                clearTimeout(hoverTimerRef.current);
                hoverTimerRef.current = null;
              }
              if (tooltipRef.current) syncTooltip(null);
              return;
            }
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = setTimeout(() => {
              showTooltip(entity, { x: movement.endPosition.x, y: movement.endPosition.y });
            }, 150);
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
            const entity = getPickedEntity(picked);
            if (!entity || !isInteractive(entity, photoMap)) {
              syncTooltip(null);
              return;
            }
            const clustered = getClusteredEntities(entity);
            if (clustered?.length) {
              showTooltip(entity, { x: movement.position.x, y: movement.position.y });
              const points = clustered
                .map((e) => e.position?.getValue?.(Cesium.JulianDate.now()))
                .filter(Boolean) as InstanceType<CesiumNS["Cartesian3"]>[];
              if (points.length > 0) {
                const sphere = Cesium.BoundingSphere.fromPoints(points);
                viewer.camera.flyToBoundingSphere(sphere, { duration: 1 });
              }
              return;
            }
            showTooltip(entity, { x: movement.position.x, y: movement.position.y });
          },
          Cesium.ScreenSpaceEventType.LEFT_CLICK,
        );

        viewer.scene.postRender.addEventListener(() => {
          const current = tooltipRef.current;
          if (!current) return;
          const worldPos = Cesium.Cartesian3.fromDegrees(current.anchorLng, current.anchorLat);
          const canvasPos = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, worldPos);
          if (canvasPos) {
            const newX = Math.round(canvasPos.x);
            const newY = Math.round(canvasPos.y);
            if (Math.abs(newX - current.x) > 1 || Math.abs(newY - current.y) > 1) {
              syncTooltip({ ...current, x: newX, y: newY });
            }
          }
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
    <div className="relative h-[calc(100svh-56px)] w-full">
      {stats ? (
        <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
          <div className="rounded-lg bg-black/60 px-3 py-2 text-sm text-white shadow-lg backdrop-blur-sm">
            <span className="font-semibold">{stats.locatedCount}</span> 张带位置照片
          </div>
          <div className="rounded-lg bg-black/60 px-3 py-2 text-sm text-white shadow-lg backdrop-blur-sm">
            <span className="font-semibold">{stats.footprintCount}</span> 个足迹点位
          </div>
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-red-400">
          {error}
        </div>
      ) : null}
      <div ref={containerRef} className="h-full w-full" />

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
    </div>
  );
}
