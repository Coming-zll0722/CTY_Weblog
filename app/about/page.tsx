import type { Metadata } from "next";
import { getPublicSettingsOrDefaults } from "@/lib/api";

export const metadata: Metadata = {
  title: "关于我",
  description: "电子信息工程背景的软件工程师，专注嵌入式测试与工程工具。",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const settings = await getPublicSettingsOrDefaults();
  const personJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Person",
    name: settings.authorName,
    knowsAbout: ["嵌入式软件测试", "自动化测试", "TCP/IP", "CAN", "Python", "FPGA"],
  }).replace(/</g, "\\u003c");
  return (
    <div className="section-shell page-shell about-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: personJsonLd }} />
      <header className="about-hero">
        <div>
          <p className="eyebrow">ABOUT / 关于</p>
          <h1>在软硬件边界上，做可靠、可解释的工程。</h1>
        </div>
        <p>我是{settings.authorName}，电子信息工程专业毕业，目前从事嵌入式软件测试。这个网站用来记录协议理解、测试设计、工具开发和持续学习。</p>
      </header>
      <div className="about-grid">
        <section><span>01</span><div><h2>关注方向</h2><p>嵌入式通信接口、测试自动化、工程工具、软件系统与 FPGA 基础。</p></div></section>
        <section><span>02</span><div><h2>解决问题</h2><p>先理解需求与风险，再设计验证路径；对重复流程进行抽象和工具化。</p></div></section>
        <section><span>03</span><div><h2>持续学习</h2><p>记录新技术的学习过程，也记录判断发生变化的原因和实践中的失败路径。</p></div></section>
        <section><span>04</span><div><h2>内容边界</h2><p>工作相关内容均经过脱敏和重新建模，不包含内部协议、真实数据或未公开信息。</p></div></section>
      </div>
      <section className="resume-band">
        <div><p className="eyebrow">KEEP IN TOUCH</p><h2>欢迎交流与纠错。</h2><p>可以通过 RSS 关注更新，也可以从联系页找到我。</p></div>
        <a className="button primary" href="/rss.xml">订阅 RSS</a>
      </section>
    </div>
  );
}
