import Link from "next/link";
import { currentFocus, skillGroups } from "@/data/profile";
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
    getPosts(8),
    getProjects(3),
    getPublicSettingsOrDefaults(),
  ]);
  const [featuredProject, ...moreProjects] = projectResponse.data;

  return (
    <>
      <section className="section-shell identity">
        <h1>工程笔记</h1>
        <p>
          我是{settings.authorName}，电子信息工程背景的嵌入式软件测试工程师。
          这里记录通信协议、测试自动化与工程工具中的问题边界、方案取舍和验证方法。
        </p>
        <div className="hero-actions">
          <Link className="button primary" href="/articles">阅读文章</Link>
          <Link className="button secondary" href="/projects">查看案例</Link>
        </div>
      </section>

      <section className="section-shell section-block" aria-labelledby="latest-articles">
        <div className="section-heading">
          <h2 id="latest-articles">最新文章</h2>
          <Link className="text-link" href="/articles">全部文章</Link>
        </div>
        {articleResponse.data.length ? (
          <div className="article-list">
            {articleResponse.data.map((article) => (
              <article className="article-row" key={article.id}>
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
          <div className="empty-state">
            <h3>文章正在整理</h3>
            <p>发布后会在这里按时间列出。</p>
          </div>
        )}
      </section>

      <section className="section-shell section-block" aria-labelledby="featured-projects">
        <div className="section-heading">
          <h2 id="featured-projects">项目案例</h2>
          <Link className="text-link" href="/projects">全部项目</Link>
        </div>
        {featuredProject ? (
          <>
            <article className="project-card featured-project">
              <div className="meta-row">
                <span>{featuredProject.status}</span>
                <span>{formatProjectPeriod(featuredProject.started_at, featuredProject.ended_at)}</span>
              </div>
              <h3><Link href={`/projects/${featuredProject.slug}`}>{featuredProject.title}</Link></h3>
              <p>{featuredProject.summary}</p>
              <dl className="project-facts-inline">
                <div>
                  <dt>问题</dt>
                  <dd>{featuredProject.problem_excerpt || "完整案例中说明问题背景与限制。"}</dd>
                </div>
                <div>
                  <dt>结果</dt>
                  <dd>{featuredProject.result_excerpt || "完整案例中说明验证路径与结果。"}</dd>
                </div>
              </dl>
              <div className="hero-actions">
                <Link className="button secondary" href={`/projects/${featuredProject.slug}`}>查看案例</Link>
              </div>
            </article>
            {moreProjects.length ? (
              <div className="project-rail">
                {moreProjects.map((project) => (
                  <Link href={`/projects/${project.slug}`} key={project.id}>
                    <span className="meta-row">{project.status}</span>
                    <h3>{project.title}</h3>
                    <p>{project.summary}</p>
                  </Link>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div className="empty-state">
            <h3>项目案例正在整理</h3>
            <p>可先阅读文章，了解具体问题与验证方法。</p>
            <Link href="/articles">阅读文章</Link>
          </div>
        )}
      </section>

      <section className="section-shell section-block" aria-labelledby="capability-map">
        <div className="section-heading">
          <h2 id="capability-map">能力地图</h2>
          <Link className="text-link" href="/stack">完整说明</Link>
        </div>
        <div className="capability-list">
          {skillGroups.slice(0, 5).map((group) => (
            <Link href={group.href} key={group.no}>
              <h3>{group.title}</h3>
              <p>{group.scenario}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-shell section-block" aria-labelledby="current-focus">
        <div className="section-heading">
          <h2 id="current-focus">当前关注</h2>
        </div>
        <div className="now-list">
          {currentFocus.slice(0, 3).map((item) => (
            <div key={item.no}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
