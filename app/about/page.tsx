import type { Metadata } from "next";

export const metadata: Metadata = { title: "关于我", description: "电子信息工程背景的软件工程师，专注嵌入式测试与工程工具。" };

export default function AboutPage() {
  return (
    <div className="section-shell page-shell about-page">
      <header className="about-hero">
        <div>
          <p className="eyebrow">ABOUT / 关于</p>
          <h1>在软硬件边界上，做可靠、可解释的工程。</h1>
        </div>
        <p>我是林序，电子信息工程专业毕业，目前从事嵌入式软件测试。我的工作横跨协议理解、测试设计、工具开发和结果分析，也在持续学习系统架构、FPGA 与 AI 辅助工程。</p>
      </header>
      <div className="about-grid">
        <section><span>01</span><div><h2>工作方向</h2><p>围绕 TCP、UDP、串口、CAN、RS422、RS485、1553B 和 ARINC 429 等接口开展测试，关注边界、时序、异常与可追溯性。</p></div></section>
        <section><span>02</span><div><h2>工程方式</h2><p>先理解需求和风险，再设计验证路径。对重复流程进行抽象和工具化，让测试结果可以复现、复核和长期维护。</p></div></section>
        <section><span>03</span><div><h2>当前研究</h2><p>协议测试平台架构、AI 辅助用例设计、FPGA 时序基础，以及前后端应用从开发到部署的完整链路。</p></div></section>
        <section><span>04</span><div><h2>技术理念</h2><p>工具不是功能堆叠；可靠来自清晰边界、显式假设、可观测过程和持续验证。公开表达同样需要尊重保密边界。</p></div></section>
      </div>
      <section className="resume-band">
        <div><p className="eyebrow">PROFILE</p><h2>需要一份更紧凑的经历说明？</h2><p>公开简历仅包含可披露教育、技能和项目经历，不含单位内部与敏感信息。</p></div>
        <a className="button primary" href="mailto:hello@example.com?subject=简历交流">联系获取简历</a>
      </section>
    </div>
  );
}
