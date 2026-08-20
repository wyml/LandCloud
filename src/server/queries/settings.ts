import "server-only";

import type { SiteSettings } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_SETTINGS: SiteSettings = {
  name: "PicBed 个人图床",
  logo: "",
  description: "个人图床相册网站",
  footer: "© PicBed",
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const admin = createAdminClient();
  const { data } = await admin.from("site_settings").select("key, value");
  const map = new Map<string, Record<string, unknown>>(
    ((data as unknown as Array<{ key: string; value: Record<string, unknown> }>) ?? []).map(
      (row) => [row.key, row.value],
    ),
  );
  const site = map.get("site") ?? {};
  return {
    name: (site.name as string) || DEFAULT_SETTINGS.name,
    logo: (site.logo as string) || DEFAULT_SETTINGS.logo,
    description: (site.description as string) || DEFAULT_SETTINGS.description,
    footer: (site.footer as string) || DEFAULT_SETTINGS.footer,
  };
}
