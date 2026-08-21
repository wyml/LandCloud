import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MapView from "@/components/site/map-view";
import { getSiteSettings } from "@/server/queries/settings";
import { getSessionUser, isAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "照片地图" };

export default async function MapPage() {
  const settings = await getSiteSettings();
  const user = await getSessionUser();
  const isAdmin = await isAdminUser(user);

  if (settings.privateMode && !isAdmin) {
    redirect("/");
  }

  return <MapView />;
}
