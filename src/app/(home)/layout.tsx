import { SiteHeader } from "@/components/site/site-header";
import { ThemeScript } from "@/components/site/theme-toggle";
import { getSiteSettings } from "@/server/queries/settings";
import { getSessionUser, isAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const user = await getSessionUser();
  const isAdmin = await isAdminUser(user);

  return (
    <div className="flex min-h-screen flex-col">
      <ThemeScript />
      <SiteHeader settings={settings} isAdmin={isAdmin} homepageTemplate={settings.homepageTemplate} />
      <main className="flex-1">{children}</main>
      {settings.homepageTemplate !== "globe" && (
        <footer className="mx-auto w-full max-w-6xl border-t border-neutral-200/60 px-4 py-8 text-center text-sm opacity-40 dark:border-neutral-800/60">
          <div dangerouslySetInnerHTML={{ __html: settings.footer }} />
        </footer>
      )}
    </div>
  );
}
