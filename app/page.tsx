import Link from "next/link";
import { skillGroups } from "@/data/profile";
import {
  formatDate,
  formatProjectPeriod,
  getPosts,
  getProjects,
  getPublicSettingsOrDefaults,
} from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [articleResponse, projectResponse, settings] = await Promise.all([
    getPosts(4),
    getProjects(3),
    getPublicSettingsOrDefaults(),
  ]);
  const articles = articleResponse.data;
  const projects = projectResponse.data;
  return (
    <>
      <section className="hero section-shell">
        <div className="hero-copy">
          <p className="eyebrow">CTY LOG</p>
          <h1>
            记录技术，也记录
            <br />
            <span>问题如何被解决。</span>
          </h1>
          <p className="hero-lead">
            这里是{settings.siteName}，由{settings.authorName}长期维护。主要分享嵌入式通信、
            自动化测试、工具开发与软件工程实践。
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/articles">
              阅读文章
            </Link>
            <Link className="button secondary" href="/projects">
              查看项目
            </Link>
          </div>
          <div className="status-line">
            <span className="status-dot" />
            最近关注：通信协议测试平台 · FPGA 时序分析 · AI 辅助测试
          </div>
        </div>

        <div className="hero-panel" aria-label="本站关注方向">
          <div className="terminal-head">
            <span>focus.yaml</span>
            <span>2026.07</span>
          </div>
          <div className="terminal-body">
            <p><b>site:</b> chongtouyue.log</p>
            <p><b>topics:</b></p>
            <ul>
              <li>embedded_communication</li>
              <li>test_automation</li>
              <li>software_tooling</li>
            </ul>
            <p><b>practice:</b></p>
            <ul>
              <li>problem_analysis</li>
              <li>repeatable_verification</li>
              <li>project_retrospective</li>
            </ul>
          </div>
          <div className="signal-chart" aria-hidden="true">
            {[18, 30, 30, 12, 12, 38, 38, 22, 22, 46, 46, 28].map((h, i) => (
              <i key={i} style={{ height: `${h}px` }} />
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell stat-strip" aria-label="内容摘要">
        <div><strong>{articleResponse.meta.total}</strong><span>篇公开文章</span></div>
        <div><strong>{projectResponse.meta.total}</strong><span>个实践项目</span></div>
        <div><strong>{skillGroups.length}</strong><span>个技术方向</span></div>
        <div><strong>持续</strong><span>记录与更新</span></div>
      </section>

      <section className="section-shell section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SELECTED WORK</p>
            <h2>把问题做成工具</h2>
          </div>
          <Link className="text-link" href="/projects">全部项目 →</Link>
        </div>
        <div className="project-grid">
          {projects.slice(0, 3).map((project, index) => (
            <Link className="project-card" href={`/projects/${project.slug}`} key={project.slug}>
              <div className="project-index">0{index + 1}</div>
              <div className="project-meta">
                <span>{project.status}</span>
                <span>{formatProjectPeriod(project.started_at, project.ended_at)}</span>
              </div>
              <h3>{project.title}</h3>
              <p>{project.summary}</p>
              <div className="tag-row">
                {project.tags.slice(0, 4).map((item) => <span key={item}>{item}</span>)}
              </div>
              <span className="card-arrow">↗</span>
            </Link>
          ))}
          {!projects.length ? (
            <div className="empty-state"><h3>项目正在整理</h3><p>完成脱敏和整理后会逐步发布。</p></div>
          ) : null}
        </div>
      </section>

      <section className="section-shell section-block two-column">
        <div>
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">WRITING</p>
              <h2>最近在写</h2>
            </div>
            <Link className="text-link" href="/articles">文章归档 →</Link>
          </div>
          <div className="article-list">
            {articles.slice(0, 4).map((article) => (
              <Link href={`/articles/${article.slug}`} className="article-row" key={article.slug}>
                <div>
                  <span className="article-category">{article.category}</span>
                  <h3>{article.title}</h3>
                  <p>{article.summary}</p>
                </div>
                <aside>
                  <time>{formatDate(article.published_at)}</time>
                  <span>{article.reading_time} 分钟</span>
                </aside>
              </Link>
            ))}
            {!articles.length ? (
              <div className="empty-state"><h3>文章正在整理</h3><p>发布后会显示在这里。</p></div>
            ) : null}
          </div>
        </div>

        <aside className="now-panel">
          <p className="eyebrow">NOW / Q3</p>
          <h2>正在推进</h2>
          <ol>
            <li>
              <span>01</span>
              <div><b>协议测试平台 2.0</b><p>统一测试执行、数据记录和报告生成。</p></div>
            </li>
            <li>
              <span>02</span>
              <div><b>FPGA 基础实验</b><p>从组合逻辑走向时序约束与仿真验证。</p></div>
            </li>
            <li>
              <span>03</span>
              <div><b>AI 辅助测试</b><p>研究需求到用例的可追溯生成流程。</p></div>
            </li>
          </ol>
        </aside>
      </section>

      <section className="section-shell section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">TECH STACK</p>
            <h2>技术栈与实践领域</h2>
          </div>
          <Link className="text-link" href="/stack">完整技术栈 →</Link>
        </div>
        <div className="capability-grid">
          {skillGroups.slice(0, 4).map((group) => (
            <article key={group.title}>
              <span className="capability-no">{group.no}</span>
              <h3>{group.title}</h3>
              <p>{group.description}</p>
              <div>{group.skills.slice(0, 5).join(" · ")}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell contact-band">
        <div>
          <p className="eyebrow">LET&apos;S CONNECT</p>
          <h2>欢迎交流、讨论与纠错。</h2>
          <p>如果你也关注嵌入式测试、工具开发或软件工程，可以从这里联系。</p>
        </div>
        {settings.contactEmail ? (
          <a className="button inverted" href={`mailto:${settings.contactEmail}`}>{settings.contactEmail} ↗</a>
        ) : (
          <Link className="button inverted" href="/contact">查看联系方式 ↗</Link>
        )}
      </section>
    </>
  );
}
