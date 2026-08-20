"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SiteSettingsInput {
  name: string;
  logo: string;
  description: string;
  footer: string;
}

export async function updateSiteSettings(input: SiteSettingsInput) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("site_settings").upsert(
    {
      key: "site",
      value: {
        name: input.name.trim(),
        logo: input.logo.trim(),
        description: input.description.trim(),
        footer: input.footer.trim(),
      },
    },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
  refresh();
}

export interface ExternalLinkInput {
  directBase: string;
  defaultType: "direct" | "proxy";
}

export async function updateExternalLinkSettings(input: ExternalLinkInput) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("site_settings").upsert(
    {
      key: "external_link",
      value: {
        direct_base: input.directBase.trim().replace(/\/$/, ""),
        default_type: input.defaultType === "direct" ? "direct" : "proxy",
      },
    },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
  refresh();
}
