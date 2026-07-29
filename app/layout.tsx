import type { Metadata } from "next";
import { headers } from "next/headers";
import { SiteFrame } from "@/components/SiteFrame";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { getPublicLinksOrEmpty, getPublicSettingsOrDefaults } from "@/lib/api";
import { getSiteOrigin } from "@/lib/site-origin";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const [incoming, settings] = await Promise.all([headers(), getPublicSettingsOrDefaults()]);
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
  const protocol = incoming.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const base = new URL(getSiteOrigin(`${protocol}://${host}`));
  return {
    metadataBase: base,
    title: { default: settings.siteName, template: `%s · ${settings.siteName}` },
    description: settings.seoDescription,
    keywords: settings.seoKeywords,
    openGraph: {
      type: "website",
      locale: "zh_CN",
      title: settings.siteName,
      description: settings.seoDescription,
      images: [{
        url: new URL("/og.png", base),
        width: 1734,
        height: 907,
        alt: `${settings.siteName}：记录技术，也记录问题如何被解决`,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: settings.siteName,
      description: settings.seoDescription,
      images: [new URL("/og.png", base)],
    },
    alternates: { canonical: "/", types: { "application/rss+xml": "/rss.xml" } },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [settings, publicLinks] = await Promise.all([
    getPublicSettingsOrDefaults(),
    getPublicLinksOrEmpty(),
  ]);
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* Vinext does not yet expose Next.js font/CSS asset handling for KaTeX. */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/katex.min.css" />
      </head>
      <body>
        <a className="skip-link" href="#main-content">跳到主要内容</a>
        <SiteFrame settings={settings} publicLinks={publicLinks}>{children}</SiteFrame>
        <AnalyticsTracker />
      </body>
    </html>
  );
}
