import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { homeProfile } from "@/data/home";
import { currentFocus, homeSkillGroups } from "@/data/profile";
import { formatDate, type PostListItem, type ProjectListItem, type PublicSettings } from "@/lib/api";

export function SectionHeading({ title, href, linkLabel = "查看全部" }: {
  title: string;
  href: string;
  linkLabel?: string;
}) {
  return (
    <div className="minimal-section-heading">
      <h2>{title}</h2>
      <Link href={href}>{linkLabel} <Icon name="arrow" size={16} /></Link>
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

function ProjectIllustration({ slug }: { slug: string }) {
  if (slug === "protocol-test-platform") {
    return (
      <svg className="minimal-project-art" viewBox="0 0 144 80" aria-hidden="true">
        <path className="minimal-art-edge" d="m16 19 4-3 35 10v43l-4 3V29zM94 7l4-3 35 10v43l-4 3V17z" />
        <path className="minimal-art-panel" d="M16 19 51 29v43L16 62zM94 7l35 10v43L94 50z" />
        <path className="minimal-art-signal" d="m51 49 43-14" />
        <circle className="minimal-art-node" cx="51" cy="49" r="3" />
        <circle className="minimal-art-node" cx="94" cy="35" r="3" />
      </svg>
    );
  }
  if (slug === "cty-log-technical-archive") {
    return (
      <svg className="minimal-project-art" viewBox="0 0 144 80" aria-hidden="true">
        {[[72, 0], [36, 6], [0, 12]].map(([x, y]) => (
          <g key={x} transform={`translate(${x} ${y})`}>
            <path className="minimal-art-panel" d="M15 5l44 14v48L15 53z" />
            <path className="minimal-art-detail" d="m24 22 26 8m-26 1 26 8m-26 1 18 6" />
          </g>
        ))}
      </svg>
    );
  }
  return <Icon name="project" size={44} />;
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
        <span className="minimal-project-symbol" aria-hidden="true"><ProjectIllustration slug={project.slug} /></span>
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
          <p className="minimal-eyebrow">个人技术记录</p>
          <h1 id="home-title">{homeProfile.brand}</h1>
          <p className="minimal-lead">{homeProfile.slogan}</p>
          <p className="minimal-description">{settings.siteDescription}</p>
          <Link className="minimal-intro-link" href="/articles">阅读文章 <Icon name="arrow" size={17} /></Link>
        </section>
        <section className="minimal-about" aria-labelledby="home-about-title">
          <h2 id="home-about-title">关于我</h2>
          <p>电子信息工程专业毕业，目前从事嵌入式软件测试。</p>
          <p>关注通信协议、测试自动化与软件工具。</p>
          <Link className="minimal-intro-link" href="/about">更多关于我 <Icon name="arrow" size={16} /></Link>
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
        <section className="minimal-stack" aria-label="技术栈">
          <SectionHeading title="技术栈" href="/stack" linkLabel="能力地图" />
          <ul className="minimal-detail-list">
            {homeSkillGroups.map((group) => (
              <li className="minimal-skill" key={group.title}>
                <Icon name={group.icon} size={19} className="minimal-skill-icon" />
                <div>
                  <div className="minimal-skill-heading">
                    <h3>{group.title}</h3>
                    <span className="minimal-skill-experience">{group.experience}</span>
                  </div>
                  <div className="minimal-skill-tags">
                    {group.skills.map((skill) => <span key={skill}>{skill}</span>)}
                  </div>
                  <p>{group.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="home-project" aria-label="代表项目">
          <SectionHeading title="代表项目" href="/projects" />
          <div className="minimal-projects">
            {projects.slice(0, 2).map((project) => <ProjectSummary key={project.id} project={project} />)}
            {!projects.length && <p className="empty-state">项目正在整理，公开案例发布后会出现在这里。</p>}
          </div>
        </section>
        <section className="minimal-focus" aria-labelledby="home-focus-title">
          <div className="minimal-section-heading"><h2 id="home-focus-title">最近在做</h2></div>
          <ul className="minimal-detail-list">
            {currentFocus.slice(0, 3).map((item) => (
              <li key={item.no}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
