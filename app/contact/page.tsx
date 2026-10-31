import type { Metadata } from "next";
import { getPublicLinksOrEmpty, getPublicSettingsOrDefaults } from "@/lib/api";

export const metadata: Metadata = {
  title: "联系方式",
  description: "就嵌入式测试、工程工具和技术写作进行交流。",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const [settings, publicLinks] = await Promise.all([
    getPublicSettingsOrDefaults(),
    getPublicLinksOrEmpty(),
  ]);
  return (
    <div className="section-shell page-shell">
      <header className="page-heading">
        <h1>联系</h1>
        <p>
          欢迎交流嵌入式软件测试、通信接口、自动化工具、工程架构与技术写作。
          请勿通过公开渠道发送密钥、内部协议、真实设备数据或其他敏感资料。
        </p>
      </header>
      <section className="contact-panel">
        <h2>联系与订阅</h2>
        <p>
          {settings.contactEmail
            ? "邮件中请简要说明主题、背景与希望讨论的问题。"
            : settings.githubUrl || publicLinks.length
              ? "可以通过下方公开主页继续了解本站，也可以订阅 RSS 获取新文章。"
              : "目前提供 RSS 订阅，可在阅读器中关注本站的新文章。"}
        </p>
        <div className="hero-actions contact-actions">
          {settings.contactEmail ? (
            <a className="button primary" href={`mailto:${settings.contactEmail}`}>
              {settings.contactEmail}
            </a>
          ) : null}
          {settings.githubUrl ? (
            <a className="button secondary" href={settings.githubUrl} target="_blank" rel="noreferrer">
              GitHub ↗
            </a>
          ) : null}
          <a className="button secondary" href="/rss.xml">订阅 RSS</a>
          {publicLinks
            .filter((item) => item.url !== settings.githubUrl)
            .map((item) => (
              <a className="button secondary" href={item.url} target="_blank" rel="noreferrer" key={item.id}>
                {item.name} ↗
              </a>
            ))}
        </div>
      </section>
    </div>
  );
}
