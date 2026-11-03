import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { homeProfile } from "@/data/home";
import { currentFocus } from "@/data/profile";
import { formatDate, type PostListItem, type ProjectListItem, type PublicSettings } from "@/lib/api";

export function SectionHeading({ title, href }: { title: string; href: string }) {
  return (
    <div className="minimal-section-heading">
      <h2>{title}</h2>
      <Link href={href}>查看全部 <Icon name="arrow" size={16} /></Link>
    </div>
  );
}

export function ArticleSummary({ article }: { article: PostListItem }) {
  return (
    <article className="minimal-article">
      <div className="minimal-meta">
        <Link href={`/categories/${article.category_slug}`}>{article.category}</Link>
        <span aria-hidden="true">·</span>
        <time dateTime={article.published_at ?? undefined}>{formatDate(article.published_at)}</time>
      </div>
      <h3><Link href={`/articles/${article.slug}`}>{article.title}</Link></h3>
      <p>{article.summary}</p>
    </article>
  );
}

export function ProjectSummary({ project }: { project: ProjectListItem }) {
  return (
    <article className="minimal-project">
      <h3>
        <Link href={`/projects/${project.slug}`}>
          {project.title}<span className="minimal-project-arrow"><Icon name="arrow" size={17} /></span>
        </Link>
      </h3>
      <p>{project.summary}</p>
      <div className="minimal-project-bottom">
        <span className="minimal-project-tags">{project.tags.join(" · ")}</span>
        <span className="minimal-project-symbol" aria-hidden="true"><Icon name="project" size={44} /></span>
      </div>
    </article>
  );
}

export function MinimalHome({ articles, projects, settings }: {
  articles: PostListItem[];
  projects: ProjectListItem[];
  settings: PublicSettings;
}) {
  return (
    <div className="minimal-home">
      <div className="minimal-intro">
        <section className="minimal-hero" aria-labelledby="home-title">
          <p className="minimal-eyebrow">{homeProfile.domain}</p>
          <h1 id="home-title">{homeProfile.brand}</h1>
          <p className="minimal-lead">{settings.siteDescription}</p>
          <p className="minimal-description">{homeProfile.description}</p>
          <Link className="minimal-about-link" href="/about">了解我 <Icon name="arrow" size={17} /></Link>
        </section>
        <section className="minimal-focus" aria-labelledby="focus-title">
          <h2 id="focus-title">最近在做</h2>
          <ul>{currentFocus.map((item) => <li key={item.no} title={item.description}>{item.title}</li>)}</ul>
        </section>
      </div>
      <div className="minimal-columns">
        <section className="home-recent" aria-label="近期文章">
          <SectionHeading title="近期文章" href="/articles" />
          <div className="minimal-articles">
            {articles.slice(0, 4).map((article) => <ArticleSummary key={article.id} article={article} />)}
            {!articles.length && <p className="empty-state">文章正在整理，发布后会在这里显示。</p>}
          </div>
        </section>
        <section className="home-project" aria-label="代表项目">
          <SectionHeading title="代表项目" href="/projects" />
          <div className="minimal-projects">
            {projects.slice(0, 2).map((project) => <ProjectSummary key={project.id} project={project} />)}
            {!projects.length && <p className="empty-state">项目正在整理，公开案例发布后会出现在这里。</p>}
          </div>
        </section>
      </div>
      <section className="minimal-personal" aria-label="关于我">
        <div>
          <h2>记录技术，记录思考，记录成长的过程。</h2>
          <p>关注嵌入式通信、测试自动化与软件工具。</p>
        </div>
        <Link href="/about">更多关于我 <Icon name="arrow" size={16} /></Link>
      </section>
    </div>
  );
}
