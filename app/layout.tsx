import type { Metadata } from "next";
import { headers } from "next/headers";
import { SiteFrame } from "@/components/SiteFrame";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "example.com";
  const protocol = incoming.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  return {
    metadataBase: base,
    title: { default: "林序 · 工程笔记", template: "%s · 林序" },
    description: "嵌入式软件测试工程师的技术博客，记录通信接口测试、自动化工具、软件架构与工程实践。",
    keywords: ["嵌入式软件测试", "自动化测试", "TCP UDP", "CAN", "Python", "C++", "FPGA"],
    openGraph: {
      type: "website",
      locale: "zh_CN",
      title: "林序 · 工程笔记",
      description: "从测试需求、协议分析到工具设计与工程实现。",
      images: [{ url: new URL("/og.png", base), width: 1732, height: 907, alt: "林序工程笔记" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "林序 · 工程笔记",
      description: "从测试需求、协议分析到工具设计与工程实现。",
      images: [new URL("/og.png", base)],
    },
    alternates: { canonical: "/", types: { "application/rss+xml": "/rss.xml" } },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  );
}
