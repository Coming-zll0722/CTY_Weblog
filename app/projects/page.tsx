import type { Metadata } from "next";
import Link from "next/link";
import { formatProjectPeriod, getProjects } from "@/lib/api";

export const metadata: Metadata = {
  title: "工程项目",
  description: "嵌入式通信测试、工具开发与个人工程项目。",
  alternates: { canonical: "/projects" },
};

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const requestedPage = Number((await searchParams).page ?? "1");
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const { data: projects, meta } = await getProjects(18, page);
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.page_size));
  return (
    <div className="section-shell page-shell">
      <header className="page-heading">
        <p className="eyebrow">PROJECTS / 项目</p>
        <h1>从需求到交付的完整实践。</h1>
        <p>关注问题定义、架构取舍、实现过程与验证结果。涉及工作内容均使用模拟数据和重新绘制的模型。</p>
      </header>
      <div className="project-grid full">
        {projects.map((project, index) => (
          <Link className="project-card" href={`/projects/${project.slug}`} key={project.slug}>
            <div className="project-index">{String(index + 1).padStart(2, "0")}</div>
            <div className="project-meta">
              <span>{project.status}</span>
              <span>{formatProjectPeriod(project.started_at, project.ended_at)}</span>
            </div>
            <h2>{project.title}</h2>
            <p>{project.summary}</p>
            <div className="tag-row">{project.tags.map((item) => <span key={item}>{item}</span>)}</div>
            <span className="card-arrow">↗</span>
          </Link>
        ))}
        {!projects.length ? (
          <div className="empty-state">
            <h2>还没有公开项目</h2>
            <p>项目完成保密检查并设为公开后，会出现在这里。</p>
          </div>
        ) : null}
      </div>
      {totalPages > 1 ? (
        <nav className="archive-pagination" aria-label="项目分页">
          {page > 1 ? <Link href={`/projects?page=${page - 1}`}>上一页</Link> : <span />}
          <span>第 {page} / {totalPages} 页</span>
          {page < totalPages ? <Link href={`/projects?page=${page + 1}`}>下一页</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
