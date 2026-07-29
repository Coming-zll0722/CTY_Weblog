import type { Metadata } from "next";
import { getPublicSettingsOrDefaults } from "@/lib/api";

export const metadata: Metadata = {
  title: "联系方式",
  description: "就嵌入式测试、工程工具和技术写作进行交流。",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getPublicSettingsOrDefaults();
  return (
    <div className="section-shell page-shell about-page">
      <header className="about-hero">
        <div>
          <p className="eyebrow">CONTACT / 联系</p>
          <h1>从一个明确的问题开始交流。</h1>
        </div>
        <p>
          欢迎交流嵌入式软件测试、通信接口、自动化工具、工程架构与技术写作。
          请勿通过公开渠道发送密钥、内部协议、真实设备数据或其他敏感资料。
        </p>
      </header>
      <section className="contact-band">
        <div>
          <p className="eyebrow">DIRECT CONTACT</p>
          <h2>{settings.contactEmail ? "通过邮件联系" : "联系方式正在配置"}</h2>
          <p>
            {settings.contactEmail
              ? "邮件中请简要说明主题、背景与希望讨论的问题。"
              : "管理员可在后台公开设置中补充联系邮箱。"}
          </p>
        </div>
        {settings.contactEmail ? (
          <a className="button inverted" href={`mailto:${settings.contactEmail}`}>
            {settings.contactEmail} ↗
          </a>
        ) : null}
      </section>
    </div>
  );
}
