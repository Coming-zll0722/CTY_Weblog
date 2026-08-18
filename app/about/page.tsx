import type { Metadata } from "next";
import Link from "next/link";
import { getPublicSettingsOrDefaults } from "@/lib/api";

export const metadata: Metadata = {
  title: "关于作者与本站",
  description: "电子信息工程背景的嵌入式软件测试工程师，以及分析、验证和公开工程内容的方式。",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const settings = await getPublicSettingsOrDefaults();
  const personJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Person",
    name: settings.authorName,
    description: "电子信息工程背景的嵌入式软件测试工程师",
    knowsAbout: ["嵌入式软件测试", "测试自动化", "TCP/IP", "CAN", "Python", "FPGA"],
  }).replace(/</g, "\\u003c");
  return (
    <div className="section-shell page-shell about-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: personJsonLd }} />
      <header className="page-heading">
        <h1>关于</h1>
        <p>
          我是{settings.authorName}，电子信息工程专业毕业，目前从事嵌入式软件测试。
          关注的不只是功能是否运行，也包括异常如何被发现、结论如何被复核、重复工作如何被工具化。
        </p>
      </header>
      <nav className="about-nav" aria-label="关于本页">
        <a href="#background">背景</a>
        <a href="#method">方法</a>
        <a href="#site">本站</a>
        <a href="#boundary">边界</a>
      </nav>
      <div className="about-sections">
        <section id="background">
          <h2>背景</h2>
          <p>
            我的技术背景连接了嵌入式通信、软件测试与工具开发。处理通信问题时，单看最终数据通常不够：
            连接状态、消息边界、时序、重复与丢失、异常恢复，以及证据是否可追溯，都会影响结论。
          </p>
        </section>
        <section id="method">
          <h2>方法</h2>
          <p>
            面对一个问题，我会先确认需求、约束和不能接受的失败，再把判断拆成可观察的状态与断言。
            方案选择并不只看能否实现，还会比较维护复杂度、定位成本、运行成本和未来变化的可能性。
          </p>
          <blockquote>能重复执行不等于能解释结果。测试工具还需要保留输入、状态、断言与报告之间的证据链。</blockquote>
        </section>
        <section id="site">
          <h2>本站</h2>
          <p>
            建立这个网站，是为了保存问题分析、方案取舍、失败路径和验证方法。文章侧重一个工程问题，
            项目页侧重从背景到复盘的完整案例；能力地图则明确技术实际用在何处，以及哪些仍处于学习阶段。
          </p>
        </section>
        <section id="boundary">
          <h2>边界</h2>
          <p>
            工作相关内容会重新建模并使用模拟数据，不公开公司或客户名称、内部协议、网络拓扑、设备标识、真实日志和敏感指标。
            不确定能否公开的内容默认不发布。本站也不会为了叙事效果虚构经历、数字或结论。
          </p>
        </section>
      </div>
      <section className="follow-up">
        <div>
          <h2>继续阅读</h2>
          <p>可以订阅 RSS，也可以通过联系页查看已经公开的联系方式。</p>
        </div>
        <div className="hero-actions">
          <a className="button primary" href="/rss.xml">订阅 RSS</a>
          <Link className="button secondary" href="/contact">联系与纠错</Link>
        </div>
      </section>
    </div>
  );
}
