import { SiteHeader } from "@/components/site/site-header";
import { getSiteSettings } from "@/server/queries/settings";
import { getSessionUser, isAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function GlobeLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const user = await getSessionUser();
  const isAdmin = await isAdminUser(user);
  return (
    <div className="flex min-h-screen flex-col bg-black">
      <SiteHeader settings={settings} isAdmin={isAdmin} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
