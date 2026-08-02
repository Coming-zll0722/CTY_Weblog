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
    getPosts(5),
    getProjects(3),
    getPublicSettingsOrDefaults(),
  ]);
  const [featuredProject, ...moreProjects] = projectResponse.data;
  const [leadArticle, ...moreArticles] = articleResponse.data;

  return (
    <>
      <section className="section-shell editorial-hero">
        <div className="editorial-hero-main">
          <p className="eyebrow">CTY LOG · ENGINEERING NOTES</p>
          <h1>把复杂系统，<br /><em>拆成可验证的问题。</em></h1>
          <p className="hero-lead">
            我是{settings.authorName}，电子信息工程背景的嵌入式软件测试工程师。
            关注通信协议、测试自动化与工程工具：先建立问题模型，再用可重复的证据验证判断。
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/projects">阅读项目案例</Link>
            <Link className="button secondary" href="/articles">浏览工程文章</Link>
          </div>
        </div>
        <aside className="editorial-hero-index" aria-label="本站内容索引">
          <p className="eyebrow">THIS PUBLICATION</p>
          <dl>
            <div><dt>方向</dt><dd>嵌入式通信 / 测试工程 / 工具开发</dd></div>
            <div><dt>内容</dt><dd>问题分析 / 案例复盘 / 验证方法</dd></div>
            <div><dt>原则</dt><dd>真实、脱敏、可复现，不虚构指标</dd></div>
            <div><dt>更新</dt><dd>围绕正在解决的问题持续整理</dd></div>
          </dl>
          <nav aria-label="快速入口">
            <Link href="/about">作者与工作方式 <span>↗</span></Link>
            <Link href="/stack">能力地图与边界 <span>↗</span></Link>
            <Link href="/search">检索全部内容 <span>↗</span></Link>
          </nav>
        </aside>
      </section>

      <section className="section-shell publication-stats" aria-label="公开内容统计">
        <p>ISSUE / 2026</p>
        <div><strong>{articleResponse.meta.total}</strong><span>公开文章</span></div>
        <div><strong>{projectResponse.meta.total}</strong><span>项目案例</span></div>
        <div><strong>{skillGroups.length}</strong><span>能力方向</span></div>
        <p>内容均经脱敏检查</p>
      </section>

      <section className="section-shell section-block case-feature">
        <div className="section-heading">
          <div><p className="eyebrow">FEATURED CASE / 代表案例</p><h2>从问题到证据，不跳过中间过程</h2></div>
          <Link className="text-link" href="/projects">全部项目 →</Link>
        </div>
        {featuredProject ? (
          <article className="featured-case">
            <div className="featured-case-intro">
              <div className="project-meta">
                <span>{featuredProject.status}</span>
                <span>{formatProjectPeriod(featuredProject.started_at, featuredProject.ended_at)}</span>
              </div>
              <h3>{featuredProject.title}</h3>
              <p>{featuredProject.summary}</p>
              <div className="tag-row">
                {featuredProject.tags.slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}
              </div>
              <Link className="button primary" href={`/projects/${featuredProject.slug}`}>阅读完整案例</Link>
            </div>
            <div className="case-reasoning">
              <div><span>01 / 问题</span><p>{featuredProject.problem_excerpt || "从重复验证与分散证据中识别需要稳定的工程边界。"}</p></div>
              <div><span>02 / 判断</span><p>{featuredProject.decision_excerpt || "先明确执行模型与接口，再决定工具形态。"}</p></div>
              <div><span>03 / 职责</span><p>{featuredProject.role_excerpt || "负责问题拆解、方案设计、实现与验证路径。"}</p></div>
              <div><span>04 / 结果</span><p>{featuredProject.result_excerpt || "形成可继续验证和迭代的公开案例。"}</p></div>
            </div>
          </article>
        ) : (
          <div className="empty-state"><h3>项目案例正在整理</h3><p>可先阅读文章，了解具体问题与验证方法。</p><Link href="/articles">浏览文章 →</Link></div>
        )}
        {moreProjects.length ? (
          <div className="case-rail">
            {moreProjects.map((project) => (
              <Link href={`/projects/${project.slug}`} key={project.id}>
                <span>{project.status}</span><h3>{project.title}</h3><p>{project.summary}</p><b>查看案例 ↗</b>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <section className="section-shell section-block writing-feature">
        <div className="section-heading">
          <div><p className="eyebrow">SELECTED WRITING / 精选文章</p><h2>从结论返回推理过程</h2></div>
          <Link className="text-link" href="/articles">文章归档 →</Link>
        </div>
        {leadArticle ? (
          <div className="writing-layout">
            <Link className="lead-story" href={`/articles/${leadArticle.slug}`}>
              <span className="article-category">{leadArticle.category}</span>
              <h3>{leadArticle.title}</h3>
              <p>{leadArticle.summary}</p>
              <footer><time>{formatDate(leadArticle.published_at)}</time><span>{leadArticle.reading_time} 分钟阅读</span><b>阅读全文 ↗</b></footer>
            </Link>
            <div className="article-list">
              {moreArticles.slice(0, 4).map((article, index) => (
                <Link href={`/articles/${article.slug}`} className="article-row" key={article.id}>
                  <span className="story-no">{String(index + 2).padStart(2, "0")}</span>
                  <div><span className="article-category">{article.category}</span><h3>{article.title}</h3><p>{article.summary}</p></div>
                  <aside><time>{formatDate(article.published_at)}</time><span>{article.reading_time} 分钟</span></aside>
                </Link>
              ))}
            </div>
          </div>
        ) : <div className="empty-state"><h3>文章正在整理</h3><p>发布后会在这里形成可检索的工程档案。</p></div>}
      </section>

      <section className="section-shell section-block capability-map">
        <div className="section-heading">
          <div><p className="eyebrow">CAPABILITY MAP / 能力地图</p><h2>技术只是工具，场景与边界同样重要</h2></div>
          <Link className="text-link" href="/stack">查看完整能力说明 →</Link>
        </div>
        <div className="capability-lines">
          {skillGroups.map((group) => (
            <Link href={group.href} key={group.no}>
              <span>{group.no}</span><h3>{group.title}</h3><p>{group.scenario}</p><b>{group.skills[0].level}</b><i>↗</i>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-shell section-block now-and-about">
        <div className="now-editorial">
          <p className="eyebrow">NOW / 当前关注</p>
          <h2>正在形成下一批可公开记录</h2>
          {currentFocus.map((item) => (
            <div key={item.no}><span>{item.no}</span><h3>{item.title}</h3><p>{item.description}</p></div>
          ))}
        </div>
        <aside className="author-note">
          <p className="eyebrow">ABOUT THE AUTHOR</p>
          <h2>在可靠性、复杂度与成本之间做可解释的取舍。</h2>
          <p>我倾向先找出系统的真实边界与失败路径，再决定需要代码、工具、流程，还是更清楚的文档。</p>
          <div className="hero-actions">
            <Link className="button primary" href="/about">了解工作方式</Link>
            <Link className="button secondary" href="/contact">联系与纠错</Link>
          </div>
        </aside>
      </section>
    </>
  );
}
