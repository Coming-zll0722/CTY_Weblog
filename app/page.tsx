import Link from "next/link";
import { skillGroups } from "@/data/profile";
import {
  formatDate,
  formatProjectPeriod,
  getPosts,
  getProjects,
} from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [articleResponse, projectResponse] = await Promise.all([
    getPosts(4),
    getProjects(3),
  ]);
  const articles = articleResponse.data;
  const projects = projectResponse.data;
  return (
    <>
      <section className="hero section-shell">
        <div className="hero-copy">
          <p className="eyebrow">边界工程志 · FIELD NOTES</p>
          <h1>
            把技术问题，
            <br />
            <span>写到可复现。</span>
          </h1>
          <p className="hero-lead">
            一份持续更新的公开工程手记。记录嵌入式通信、测试自动化、软件工具与软硬件边界上的
            实验、判断和复盘。
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/articles">
              开始阅读
            </Link>
            <Link className="button secondary" href="/projects">
              浏览实践
            </Link>
          </div>
          <div className="status-line">
            <span className="status-dot" />
            本期主题：协议测试平台 · FPGA 时序 · AI 辅助验证
          </div>
        </div>

        <div className="hero-panel" aria-label="本站内容索引">
          <div className="terminal-head">
            <span>index.md</span>
            <span>ISSUE 07</span>
          </div>
          <div className="terminal-body">
            <p><b>publication:</b> boundary_engineering</p>
            <p><b>tracks:</b></p>
            <ul>
              <li>embedded_interfaces</li>
              <li>test_automation</li>
              <li>software_tooling</li>
            </ul>
            <p><b>editorial_rules:</b></p>
            <ul>
              <li>evidence &gt; opinion</li>
              <li>reproducible &gt; impressive</li>
              <li>context before conclusion</li>
            </ul>
          </div>
          <div className="signal-chart" aria-hidden="true">
            {[18, 30, 30, 12, 12, 38, 38, 22, 22, 46, 46, 28].map((h, i) => (
              <i key={i} style={{ height: `${h}px` }} />
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell stat-strip" aria-label="本站内容摘要">
        <div><strong>{articleResponse.meta.total}</strong><span>篇公开文章</span></div>
        <div><strong>{projectResponse.meta.total}</strong><span>个实践项目</span></div>
        <div><strong>{skillGroups.length}</strong><span>条技术主线</span></div>
        <div><strong>持续</strong><span>实验与复盘</span></div>
      </section>

      <section className="section-shell section-block two-column">
        <div>
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">LATEST NOTES</p>
              <h2>最近更新</h2>
            </div>
            <Link className="text-link" href="/articles">进入文章索引 →</Link>
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
              <div className="empty-state"><h3>第一篇笔记正在整理</h3><p>实验过程和验证依据会一起发布。</p></div>
            ) : null}
          </div>
        </div>

        <aside className="now-panel">
          <p className="eyebrow">CURRENT ISSUE / 07</p>
          <h2>本期关注</h2>
          <ol>
            <li>
              <span>01</span>
              <div><b>协议测试平台</b><p>从测试执行到证据归档，如何形成完整闭环。</p></div>
            </li>
            <li>
              <span>02</span>
              <div><b>FPGA 时序基础</b><p>用小实验理解约束、仿真与验证边界。</p></div>
            </li>
            <li>
              <span>03</span>
              <div><b>AI 辅助验证</b><p>讨论生成效率，也记录它不该替代的判断。</p></div>
            </li>
          </ol>
        </aside>
      </section>

      <section className="section-shell section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">PROJECT LAB</p>
            <h2>把判断放进真实实践</h2>
          </div>
          <Link className="text-link" href="/projects">全部实践 →</Link>
        </div>
        <div className="project-grid">
          {projects.slice(0, 3).map((project, index) => (
            <Link className="project-card" href={`/projects/${project.slug}`} key={project.slug}>
              <div className="project-index">LAB / 0{index + 1}</div>
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
            <div className="empty-state"><h3>实践记录正在整理</h3><p>只发布可以说明问题、复现过程的项目。</p></div>
          ) : null}
        </div>
      </section>

      <section className="section-shell section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">TECHNOLOGY MAP</p>
            <h2>沿着问题建立知识地图</h2>
          </div>
          <Link className="text-link" href="/stack">查看完整地图 →</Link>
        </div>
        <div className="capability-grid">
          {skillGroups.slice(0, 4).map((group) => (
            <article key={group.title}>
              <span className="capability-no">TRACK / {group.no}</span>
              <h3>{group.title}</h3>
              <p>{group.description}</p>
              <div>{group.skills.slice(0, 5).join(" · ")}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell contact-band">
        <div>
          <p className="eyebrow">FOLLOW THE LOG</p>
          <h2>持续更新，不追赶热度。</h2>
          <p>通过 RSS 获取新文章，也可以从时间线查看本站正在研究和修订的内容。</p>
        </div>
        <div className="band-actions">
          <a className="button inverted" href="/rss.xml">订阅 RSS ↗</a>
          <Link className="button ghost-inverted" href="/timeline">查看时间线</Link>
        </div>
      </section>
    </>
  );
}
