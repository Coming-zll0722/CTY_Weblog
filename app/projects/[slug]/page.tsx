import Link from "next/link";
import { notFound } from "next/navigation";
import { projects } from "@/data/site";

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export default async function ProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);
  if (!project) notFound();
  return (
    <div className="section-shell project-detail page-shell">
      <Link href="/projects" className="back-link">← 返回项目</Link>
      <header>
        <div className="project-meta"><span>{project.status}</span><span>{project.period}</span></div>
        <h1>{project.title}</h1>
        <p>{project.summary}</p>
        <div className="tag-row">{project.stack.map((item) => <span key={item}>{item}</span>)}</div>
      </header>
      <div className="project-facts">
        <div><span>我的职责</span><strong>{project.role}</strong></div>
        <div><span>关键难点</span><strong>{project.challenge}</strong></div>
        <div><span>项目结果</span><strong>{project.result}</strong></div>
      </div>
      <section className="case-section">
        <p className="eyebrow">SYSTEM DESIGN</p>
        <h2>系统如何组织</h2>
        <p>系统采用边界清晰的分层结构：界面只负责操作与反馈，应用服务编排测试流程，协议适配器隔离不同设备与接口差异，结果服务统一记录原始数据、断言与运行上下文。</p>
        <div className="architecture-stack">
          <div><span>交互层</span><b>用例编排 · 实时状态 · 结果查看</b></div>
          <div><span>应用层</span><b>执行引擎 · 任务队列 · 报告生成</b></div>
          <div><span>领域层</span><b>数据帧 · 断言 · 协议适配器</b></div>
          <div><span>基础设施</span><b>设备驱动 · 数据库 · 文件存储</b></div>
        </div>
      </section>
      <section className="case-section split">
        <div><p className="eyebrow">DECISION 01</p><h2>适配差异，而不是复制流程</h2><p>统一接口定义连接、发送、接收和关闭能力。测试执行器不知道底层使用的是 Socket、串口还是总线驱动。</p></div>
        <div><p className="eyebrow">DECISION 02</p><h2>原始数据与解释结果并存</h2><p>既保存原始帧，也保存字段解析、校验结果和断言。这样既便于快速阅读，也保留复核依据。</p></div>
      </section>
      <section className="confidentiality-note">
        <b>公开边界说明</b>
        <p>本项目页面使用通用架构描述与模拟数据，不展示公司、客户、产品型号、内部协议、真实测试数据或未经授权的界面截图。</p>
      </section>
    </div>
  );
}
