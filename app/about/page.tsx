import type { Metadata } from "next";
import { getPublicSettingsOrDefaults } from "@/lib/api";

export const metadata: Metadata = {
  title: "关于本站",
  description: "边界工程志的写作主题、内容原则与维护方式。",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const settings = await getPublicSettingsOrDefaults();
  const blogJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Blog",
    name: settings.siteName,
    description: settings.siteDescription,
    author: { "@type": "Person", name: settings.authorName },
  }).replace(/</g, "\\u003c");
  return (
    <div className="section-shell page-shell about-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: blogJsonLd }} />
      <header className="about-hero">
        <div>
          <p className="eyebrow">ABOUT THE LOG / 关于本站</p>
          <h1>这里不展示答案，记录答案如何成立。</h1>
        </div>
        <p>「边界工程志」由{settings.authorName}持续维护，关注软件与硬件、协议与实现、经验与证据之间的边界。文章尽量保留问题背景、判断依据、失败路径和验证方式。</p>
      </header>
      <div className="about-grid">
        <section><span>01</span><div><h2>写什么</h2><p>嵌入式通信、测试自动化、软件工具、系统部署、数字逻辑，以及这些主题在真实工程中的交叉问题。</p></div></section>
        <section><span>02</span><div><h2>怎么写</h2><p>先交代上下文，再呈现方案与取舍；能给步骤就不给口号，能给证据就不只给结论。</p></div></section>
        <section><span>03</span><div><h2>如何更新</h2><p>文章不是一次性发布物。实践发生变化、结论被推翻或工具完成迭代时，会在时间线中保留修订记录。</p></div></section>
        <section><span>04</span><div><h2>内容边界</h2><p>所有工作相关内容均经过脱敏和重新建模，只讨论可公开复现的方法，不包含内部协议、真实数据或未公开信息。</p></div></section>
      </div>
      <section className="editorial-band">
        <div><p className="eyebrow">EDITORIAL PRINCIPLE</p><h2>可复现，比看起来正确更重要。</h2><p>本站长期维护，欢迎通过 RSS 订阅更新；发现事实错误时，也欢迎指出。</p></div>
        <a className="button primary" href="/rss.xml">订阅 RSS</a>
      </section>
    </div>
  );
}
