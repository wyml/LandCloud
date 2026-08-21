import "server-only";

import type { ExternalLinkSettings, SiteSettings } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_SETTINGS: SiteSettings = {
  name: "LandCloud",
  logo: "",
  description: "个人图床相册网站",
  footer: "© LandCloud",
  defaultPublic: true,
  privateMode: false,
  homepageTemplate: "classic",
};

const DEFAULT_EXTERNAL_LINK: ExternalLinkSettings = {
  directBase: "",
  defaultType: "proxy",
};

async function getSettingsMap(): Promise<Map<string, Record<string, unknown>>> {
  const admin = createAdminClient();
  const { data } = await admin.from("site_settings").select("key, value");
  return new Map<string, Record<string, unknown>>(
    ((data as unknown as Array<{ key: string; value: Record<string, unknown> }>) ?? []).map(
      (row) => [row.key, row.value],
    ),
  );
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const site = (await getSettingsMap()).get("site") ?? {};
  return {
    name: (site.name as string) || DEFAULT_SETTINGS.name,
    logo: (site.logo as string) || DEFAULT_SETTINGS.logo,
    description: (site.description as string) || DEFAULT_SETTINGS.description,
    footer: (site.footer as string) || DEFAULT_SETTINGS.footer,
    defaultPublic: site.default_public !== undefined ? Boolean(site.default_public) : DEFAULT_SETTINGS.defaultPublic,
    privateMode: site.private_mode !== undefined ? Boolean(site.private_mode) : DEFAULT_SETTINGS.privateMode,
    homepageTemplate: site.homepage_template === "globe" ? "globe" : "classic",
  };
}

export async function getExternalLinkSettings(): Promise<ExternalLinkSettings> {
  const value = (await getSettingsMap()).get("external_link") ?? {};
  const defaultType =
    value.default_type === "direct" || value.default_type === "proxy"
      ? value.default_type
      : DEFAULT_EXTERNAL_LINK.defaultType;
  return {
    directBase:
      (value.direct_base as string)?.replace(/\/$/, "") || DEFAULT_EXTERNAL_LINK.directBase,
    defaultType,
  };
}
