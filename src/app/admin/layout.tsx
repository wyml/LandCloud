import type { Metadata } from "next";
import { getSiteSettings } from "@/server/queries/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: {
      default: `${settings.name} 后台`,
      template: `%s | ${settings.name} 后台`,
    },
  };
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
