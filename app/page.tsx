import Link from "next/link";
import { currentFocus, skillGroups } from "@/data/profile";
import {
  formatDate,
  formatProjectPeriod,
  getPosts,
  getProjects,
} from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [articleResponse, projectResponse] = await Promise.all([
    getPosts(8),
    getProjects(3),
  ]);
  const [featuredProject, ...moreProjects] = projectResponse.data;
  const latestArticle = articleResponse.data[0];

  return (
    <div className="section-shell home-dashboard">
      <section className="dashboard-hero" aria-labelledby="dashboard-title">
        <div className="dashboard-hero-copy">
          <span className="hero-kicker"><i /> Engineering Knowledge Dashboard</span>
          <h1 id="dashboard-title">把复杂工程问题，整理成可验证的解决路径。</h1>
          <p>
            因为懂得了全局性的东西，就更会使用局部性的东西，因为局部性的东西是隶属于全局性的东西的。
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/articles">进入知识库</Link>
            <Link className="button secondary" href="/projects">查看工程案例</Link>
          </div>
        </div>
        <div className="hero-brand-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/fromtouyue-brand.png"
            alt="从头越：雄关漫道真如铁，而今迈步从头越。"
            width={1365}
            height={601}
          />
        </div>
      </section>

      <section className="dashboard-metrics" aria-label="知识库概览">
        <article>
          <span className="metric-icon blue">▤</span>
          <div><strong>{articleResponse.meta.total}</strong><span>公开文章</span></div>
          <small>持续整理</small>
        </article>
        <article>
          <span className="metric-icon violet">◇</span>
          <div><strong>{projectResponse.meta.total}</strong><span>工程案例</span></div>
          <small>问题到验证</small>
        </article>
        <article>
          <span className="metric-icon cyan">◫</span>
          <div><strong>{skillGroups.length}</strong><span>能力域</span></div>
          <small>场景化说明</small>
        </article>
        <article>
          <span className="metric-icon orange">↗</span>
          <div><strong>{currentFocus.length}</strong><span>当前关注</span></div>
          <small>{latestArticle ? `更新于 ${formatDate(latestArticle.published_at)}` : "等待更新"}</small>
        </article>
      </section>

      <div className="dashboard-main-grid">
        <section className="dashboard-card dashboard-articles" aria-labelledby="latest-articles">
          <div className="section-heading">
            <div>
              <span className="section-kicker">KNOWLEDGE STREAM</span>
              <h2 id="latest-articles">最新文章</h2>
            </div>
            <Link className="text-link" href="/articles">全部文章 ↗</Link>
          </div>
          {articleResponse.data.length ? (
            <div className="article-list">
              {articleResponse.data.slice(0, 5).map((article, index) => (
                <article className="article-row" key={article.id}>
                  <span className="article-index">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="meta-row">
                      <span className="article-category">{article.category}</span>
                      {article.series ? <span>{article.series}</span> : null}
                    </div>
                    <h3><Link href={`/articles/${article.slug}`}>{article.title}</Link></h3>
                    <p>{article.summary}</p>
                  </div>
                  <aside>
                    <time dateTime={article.published_at ?? undefined}>{formatDate(article.published_at)}</time>
                    <span>{article.reading_time} 分钟</span>
                  </aside>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state"><h3>文章正在整理</h3><p>发布后会在这里按时间列出。</p></div>
          )}
        </section>

        <aside className="dashboard-side-stack">
          <section className="dashboard-card focus-card" aria-labelledby="current-focus">
            <div className="section-heading">
              <div>
                <span className="section-kicker">CURRENT FOCUS</span>
                <h2 id="current-focus">当前关注</h2>
              </div>
            </div>
            <div className="now-list">
              {currentFocus.slice(0, 3).map((item, index) => (
                <div key={item.no}>
                  <span className={`focus-state state-${index + 1}`} />
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-card capability-card" aria-labelledby="capability-map">
            <div className="section-heading">
              <div>
                <span className="section-kicker">CAPABILITY MAP</span>
                <h2 id="capability-map">能力地图</h2>
              </div>
              <Link className="text-link" href="/stack">完整说明</Link>
            </div>
            <div className="capability-list">
              {skillGroups.slice(0, 5).map((group) => (
                <Link href={group.href} key={group.no}>
                  <span>{group.no}</span>
                  <div><h3>{group.title}</h3><p>{group.scenario}</p></div>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="dashboard-card dashboard-projects" aria-labelledby="featured-projects">
        <div className="section-heading">
          <div>
            <span className="section-kicker">ENGINEERING CASES</span>
            <h2 id="featured-projects">项目案例</h2>
          </div>
          <Link className="text-link" href="/projects">全部项目 ↗</Link>
        </div>
        {featuredProject ? (
          <div className="project-dashboard-grid">
            <article className="project-card featured-project">
              <div className="project-status-line">
                <span><i />{featuredProject.status}</span>
                <span>{formatProjectPeriod(featuredProject.started_at, featuredProject.ended_at)}</span>
              </div>
              <h3><Link href={`/projects/${featuredProject.slug}`}>{featuredProject.title}</Link></h3>
              <p>{featuredProject.summary}</p>
              <dl className="project-facts-inline">
                <div><dt>问题</dt><dd>{featuredProject.problem_excerpt || "完整案例中说明问题背景与限制。"}</dd></div>
                <div><dt>结果</dt><dd>{featuredProject.result_excerpt || "完整案例中说明验证路径与结果。"}</dd></div>
              </dl>
              <Link className="project-open-link" href={`/projects/${featuredProject.slug}`}>打开案例 <span>↗</span></Link>
            </article>
            {moreProjects.length ? (
              <div className="project-rail">
                {moreProjects.map((project) => (
                  <Link href={`/projects/${project.slug}`} key={project.id}>
                    <span className="meta-row">{project.status}</span>
                    <h3>{project.title}</h3>
                    <p>{project.summary}</p>
                    <span className="rail-arrow">↗</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="empty-state"><h3>项目案例正在整理</h3><p>可先阅读文章，了解具体问题与验证方法。</p></div>
        )}
      </section>
    </div>
  );
}
