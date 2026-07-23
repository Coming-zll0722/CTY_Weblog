import type { Metadata } from "next";
import Link from "next/link";
import { projects } from "@/data/site";

export const metadata: Metadata = {
  title: "工程项目",
  description: "嵌入式通信测试、工具开发与个人工程项目。",
  alternates: { canonical: "/projects" },
};

export default function ProjectsPage() {
  return (
    <div className="section-shell page-shell">
      <header className="page-heading">
        <p className="eyebrow">PROJECTS / 项目</p>
        <h1>从需求到交付的完整实践。</h1>
        <p>关注问题定义、架构取舍、实现过程与验证结果。涉工作内容均使用模拟数据和重新绘制的模型。</p>
      </header>
      <div className="project-grid full">
        {projects.map((project, index) => (
          <Link className="project-card" href={`/projects/${project.slug}`} key={project.slug}>
            <div className="project-index">{String(index + 1).padStart(2, "0")}</div>
            <div className="project-meta"><span>{project.status}</span><span>{project.period}</span></div>
            <h2>{project.title}</h2>
            <p>{project.summary}</p>
            <div className="tag-row">{project.stack.map((item) => <span key={item}>{item}</span>)}</div>
            <span className="card-arrow">↗</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
