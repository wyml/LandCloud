import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSiteSettings } from "@/server/queries/settings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const logoWithTimestamp = settings.logo
    ? `${settings.logo}?t=${Date.now()}`
    : undefined;
  return {
    title: {
      default: settings.name,
      template: `%s | ${settings.name}`,
    },
    description: settings.description,
    icons: logoWithTimestamp
      ? {
          icon: logoWithTimestamp,
          apple: logoWithTimestamp,
        }
      : undefined,
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
