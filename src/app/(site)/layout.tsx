import { SiteHeader } from "@/components/site/site-header";
import { ThemeScript } from "@/components/site/theme-toggle";
import { getSiteSettings } from "@/server/queries/settings";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettings();

  return (
    <div className="flex min-h-screen flex-col">
      <ThemeScript />
      <SiteHeader settings={settings} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-neutral-200 py-6 text-center text-sm opacity-60 dark:border-neutral-800">
        {settings.footer}
      </footer>
    </div>
  );
}
