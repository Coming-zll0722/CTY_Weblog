import type { Metadata } from "next";
import Link from "next/link";
import { formatProjectPeriod, getProjects } from "@/lib/api";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const page = Number((await searchParams).page ?? "1");
  return {
    title: "工程项目",
    description: "嵌入式通信测试、工程工具与内容系统案例，包含问题、职责、关键判断与验证路径。",
    alternates: { canonical: page > 1 ? `/projects?page=${page}` : "/projects" },
    robots: page > 1 ? { index: false, follow: true } : undefined,
  };
}
export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const requestedPage = Number((await searchParams).page ?? "1");
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const { data: projects, meta } = await getProjects(12, page);
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.page_size));
  return (
    <div className="section-shell page-shell projects-page">
      <header className="page-heading editorial-heading">
        <p className="eyebrow">CASE FILES / 项目案例</p>
        <h1>把交付结果，<br />还原为决策过程。</h1>
        <p>每个案例说明问题与限制、承担的职责、关键判断、验证方法和下一步。涉及工作内容时，只保留经过脱敏和重新建模的信息。</p>
      </header>
      <div className="project-archive">
        {projects.map((project, index) => (
          <article className={index === 0 && page === 1 ? "project-entry featured" : "project-entry"} key={project.id}>
            <div className="project-entry-index"><span>{String((page - 1) * 12 + index + 1).padStart(2, "0")}</span><small>{project.status}</small></div>
            <div className="project-entry-main">
              <div className="project-meta"><span>{formatProjectPeriod(project.started_at, project.ended_at)}</span><span>{project.tags.slice(0, 3).join(" · ")}</span></div>
              <h2><Link href={`/projects/${project.slug}`}>{project.title}</Link></h2>
              <p className="project-deck">{project.summary}</p>
              <dl className="project-preview-facts">
                <div><dt>解决的问题</dt><dd>{project.problem_excerpt || "完整案例中说明问题背景与限制。"}</dd></div>
                <div><dt>承担的职责</dt><dd>{project.role_excerpt || "完整案例中说明实际职责与工作边界。"}</dd></div>
                <div><dt>关键判断</dt><dd>{project.decision_excerpt || "完整案例中说明架构选择与取舍。"}</dd></div>
              </dl>
            </div>
            <aside className="project-entry-aside"><p className="eyebrow">WHY READ</p><p>{project.result_excerpt || "阅读完整的问题拆解、验证路径与复盘。"}</p><Link href={`/projects/${project.slug}`}>进入案例 <span>↗</span></Link></aside>
          </article>
        ))}
        {!projects.length ? (
          <div className="empty-state"><h2>还没有公开项目</h2><p>项目完成保密检查后会出现在这里。你可以先从文章了解具体工程问题。</p><Link href="/articles">浏览工程文章 →</Link></div>
        ) : null}
      </div>
      {totalPages > 1 ? (
        <nav className="archive-pagination" aria-label="项目分页">
          {page > 1 ? <Link href={`/projects?page=${page - 1}`} rel="prev">上一页</Link> : <span />}
          <span>第 {page} / {totalPages} 页</span>
          {page < totalPages ? <Link href={`/projects?page=${page + 1}`} rel="next">下一页</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
