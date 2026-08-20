import { SettingsForm } from "@/components/admin/settings/settings-form";
import { getExternalLinkSettings, getSiteSettings } from "@/server/queries/settings";

export const metadata = { title: "站点设置" };

export default async function AdminSettingsPage() {
  const [site, externalLink] = await Promise.all([getSiteSettings(), getExternalLinkSettings()]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">站点设置</h1>
      <p className="text-sm opacity-60">保存后前台首页即时生效。</p>
      <SettingsForm site={site} externalLink={externalLink} />
    </div>
  );
}
