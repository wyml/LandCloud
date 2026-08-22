import { SiteHeader } from "@/components/site/site-header";
import { getSiteSettings } from "@/server/queries/settings";
import { getSessionUser, isAdminUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettings();
  const user = await getSessionUser();
  const isAdmin = await isAdminUser(user);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader settings={settings} isAdmin={isAdmin} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-neutral-200/60 py-8 text-center text-sm opacity-40 dark:border-neutral-800/60">
        <div dangerouslySetInnerHTML={{ __html: settings.footer }} />
      </footer>
    </div>
  );
}
