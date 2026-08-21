"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { PublicImage, SiteSettings } from "@/lib/types";

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

export function GlobeHome({
  settings,
  recentPhotos,
}: {
  settings: SiteSettings;
  recentPhotos: PublicImage[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<InstanceType<CesiumNS["Viewer"]> | null>(null);
  const tooltipRef = useRef<TooltipState | null>(null);
  const photoMapRef = useRef(new Map<string, MapPhoto>());
  const tooltipLockRef = useRef(false);
  const flyToRef = useRef<((lng: number, lat: number, photoId: string, photoTitle: string) => void) | null>(null);

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [cardExpanded, setCardExpanded] = useState(true);
  const [stats, setStats] = useState<MapData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const syncTooltip = (state: TooltipState | null) => {
    tooltipRef.current = state;
    setTooltip(state);
    if (!state) tooltipLockRef.current = false;
  };

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

        const photoMap = new Map<string, MapPhoto>();
        for (const p of data.photos) photoMap.set(p.id, p);
        photoMapRef.current = photoMap;

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

        const positions: InstanceType<CesiumNS["Cartesian3"]>[] = [];
        for (const photo of data.photos) {
          const position = Cesium.Cartesian3.fromDegrees(photo.lng, photo.lat);
          positions.push(position);
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

        function showTooltipForPhoto(photo: MapPhoto) {
          syncTooltip({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            photos: [{ id: photo.id, title: photo.title }],
            anchorLng: photo.lng,
            anchorLat: photo.lat,
          });
        }

        flyToRef.current = (lng, lat, photoId, photoTitle) => {
          const v = viewerRef.current;
          if (!v) return;
          v.camera.flyTo({
            destination: (Cesium as unknown as CesiumNS).Cartesian3.fromDegrees(lng, lat, 50000),
            duration: 2.5,
            complete: () => {
              if (!destroyed) {
                tooltipLockRef.current = true;
                showTooltipForPhoto({ id: photoId, title: photoTitle, lat, lng, taken_at: null });
                setTimeout(() => { tooltipLockRef.current = false; }, 5000);
              }
            },
          });
        };

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

        function getPickedEntity(picked: unknown): unknown {
          if (!picked) return null;
          const p = picked as Record<string, unknown>;

          if (Array.isArray(p.clusteredEntities) && p.clusteredEntities.length > 0) return p;

          const id = p.id as Record<string, unknown> | undefined;
          if (id) {
            if (Array.isArray(id.clusteredEntities) && id.clusteredEntities.length > 0) return id;
            if (id.cluster && Array.isArray((id.cluster as Record<string, unknown>).clusteredEntities)) return id;
            if (typeof id === "object" && "properties" in id) return id;
          }

          const primitive = p.primitive as Record<string, unknown> | undefined;
          if (primitive?.id) {
            const pid = primitive.id as Record<string, unknown>;
            if (Array.isArray(pid.clusteredEntities) && pid.clusteredEntities.length > 0) return pid;
            if (pid.cluster && Array.isArray((pid.cluster as Record<string, unknown>).clusteredEntities)) return pid;
            if (typeof pid === "object" && "properties" in pid) return pid;
          }

          return null;
        }

        function isInteractive(entity: unknown): boolean {
          const clustered = getClusteredEntities(entity);
          if (clustered?.length) return true;
          return !!(entity as EntityLike).properties?.getValue?.()?.imageId;
        }

        function showTooltipForEntity(entity: unknown, screenPos: { x: number; y: number }) {
          const e = entity as EntityLike;
          const photos: TooltipPhoto[] = [];
          let anchorLng = 0;
          let anchorLat = 0;

          const clustered = getClusteredEntities(entity);
          if (clustered?.length) {
            let sumLng = 0;
            let sumLat = 0;
            let count = 0;
            for (const ce of clustered) {
              let photo = photoMap.get(ce.id ?? "");
              if (!photo) {
                const props = ce.properties?.getValue?.();
                if (props?.imageId) photo = photoMap.get(props.imageId);
              }
              if (photo) {
                photos.push({ id: photo.id, title: photo.title });
                sumLng += photo.lng;
                sumLat += photo.lat;
                count++;
              } else if (ce.id) {
                photos.push({ id: ce.id, title: ce.properties?.getValue?.()?.title ?? "" });
              }
            }
            if (count > 0) {
              anchorLng = sumLng / count;
              anchorLat = sumLat / count;
            }
          } else {
            const props = e.properties?.getValue?.();
            if (props?.imageId) {
              const p = photoMap.get(props.imageId);
              if (p) {
                photos.push({ id: p.id, title: p.title });
                anchorLng = p.lng;
                anchorLat = p.lat;
              }
            }
          }

          if (photos.length > 0) {
            syncTooltip({ x: screenPos.x, y: screenPos.y, photos, anchorLng, anchorLat });
          }
        }

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

        handler.setInputAction(
          (movement: { endPosition: InstanceType<CesiumNS["Cartesian2"]> }) => {
            if (tooltipLockRef.current) return;
            const picked = viewer.scene.pick(movement.endPosition);
            const entity = getPickedEntity(picked);
            if (!entity || !isInteractive(entity)) {
              if (tooltipRef.current) syncTooltip(null);
              return;
            }
            showTooltipForEntity(entity, { x: movement.endPosition.x, y: movement.endPosition.y });
          },
          Cesium.ScreenSpaceEventType.MOUSE_MOVE,
        );

        handler.setInputAction(
          (movement: { position: InstanceType<CesiumNS["Cartesian2"]> }) => {
            const picked = viewer.scene.pick(movement.position);
            const entity = getPickedEntity(picked);
            if (!entity || !isInteractive(entity)) {
              syncTooltip(null);
              return;
            }
            const clustered = getClusteredEntities(entity);
            if (clustered?.length) {
              showTooltipForEntity(entity, { x: movement.position.x, y: movement.position.y });
              const points = clustered
                .map((ce) => ce.position?.getValue?.(Cesium.JulianDate.now()))
                .filter(Boolean) as InstanceType<CesiumNS["Cartesian3"]>[];
              if (points.length > 0) {
                const sphere = Cesium.BoundingSphere.fromPoints(points);
                viewer.camera.flyToBoundingSphere(sphere, { duration: 1 });
              }
              return;
            }
            showTooltipForEntity(entity, { x: movement.position.x, y: movement.position.y });
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

        // Random fly to a photo location
        if (data.photos.length > 0) {
          const randomPhoto = data.photos[Math.floor(Math.random() * data.photos.length)];
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(randomPhoto.lng, randomPhoto.lat, 50000),
            duration: 3,
            complete: () => {
              if (!destroyed) {
                tooltipLockRef.current = true;
                showTooltipForPhoto(randomPhoto);
                setTimeout(() => { tooltipLockRef.current = false; }, 5000);
              }
            },
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
    };
  }, []);

  return (
    <div className="relative -mt-14 h-[100svh] min-h-[560px] w-full bg-black">
      {error ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-red-400">
          {error}
        </div>
      ) : null}

      <div ref={containerRef} className="h-full w-full" />

      {/* Tooltip overlay */}
      {tooltip && tooltip.photos.length > 0 && (
        <div
          className="pointer-events-auto absolute z-20"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%) translateY(-14px)",
          }}
        >
          <div className="w-[280px] overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900/95 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-1.5">
              <span className="text-xs font-medium text-white/70">
                {tooltip.photos[0]?.title || "照片"}
              </span>
              <button
                type="button"
                onClick={() => syncTooltip(null)}
                className="text-xs text-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-2">
              <Link
                href={`/images/${tooltip.photos[0].id}`}
                className="group block overflow-hidden rounded-lg"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/f/${tooltip.photos[0].id}/display`}
                  alt={tooltip.photos[0].title}
                  className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </Link>
            </div>
            <div className="flex justify-center pb-1">
              <div className="h-2 w-4 -translate-y-px rotate-180 overflow-hidden">
                <div className="h-3 w-3 translate-x-[3px] translate-y-[-4px] rotate-45 border border-neutral-700 bg-neutral-900" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating info card */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setCardExpanded((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white/80 backdrop-blur-md transition-colors hover:bg-black/70"
        >
          {cardExpanded ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        {cardExpanded && (
          <div className="w-72 max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-black/60 p-4 text-white shadow-2xl backdrop-blur-md">
            <h2 className="text-lg font-semibold">{settings.name}</h2>
            {settings.description && (
              <p className="mt-1 text-sm text-white/60">{settings.description}</p>
            )}

            {stats && (
              <div className="mt-3 flex gap-3 text-xs text-white/50">
                <span>{stats.locatedCount} 张带位置</span>
                <span>{stats.footprintCount} 个足迹</span>
              </div>
            )}

            {recentPhotos.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-white/50">最新照片</p>
                <div className="grid grid-cols-3 gap-1">
                  {recentPhotos.slice(0, 9).map((photo) => {
                    const hasGps = photo.gps_lat != null && photo.gps_lng != null;
                    return hasGps ? (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => flyToRef.current?.(photo.gps_lng!, photo.gps_lat!, photo.id, photo.title || photo.original_name)}
                        className="group aspect-square overflow-hidden rounded-lg bg-neutral-800"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/f/${photo.id}/thumb_sm`}
                          alt={photo.title || photo.original_name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                        />
                      </button>
                    ) : (
                      <Link
                        key={photo.id}
                        href={`/images/${photo.id}`}
                        className="group aspect-square overflow-hidden rounded-lg bg-neutral-800"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/f/${photo.id}/thumb_sm`}
                          alt={photo.title || photo.original_name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Link
                href="/albums"
                className="rounded-lg border border-white/20 px-3 py-1.5 text-xs transition-colors hover:bg-white/10"
              >
                相册
              </Link>
              <Link
                href="/map"
                className="rounded-lg border border-white/20 px-3 py-1.5 text-xs transition-colors hover:bg-white/10"
              >
                地图
              </Link>
              <Link
                href="/search"
                className="rounded-lg border border-white/20 px-3 py-1.5 text-xs transition-colors hover:bg-white/10"
              >
                搜索
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
