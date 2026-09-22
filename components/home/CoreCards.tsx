/* Native images use the existing FastAPI variants or precompressed local WebP assets. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { articleFallbackCovers, homeProfile, learningPlan } from "@/data/home";
import { formatDate, type PostListItem } from "@/lib/api";
import type { ReactNode } from "react";

export function SectionHeader({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children?: ReactNode;
}) {
  return (
    <div className="bento-heading">
      <h2>{title}</h2>
      {href ? (
        <Link href={href}>
          查看全部 <Icon name="arrow" size={14} />
        </Link>
      ) : (
        (children ?? (
          <span className="section-dots" aria-hidden="true">
            ··
          </span>
        ))
      )}
    </div>
  );
}

export function HeroCard({
  articles,
  projects,
}: {
  articles: number;
  projects: number;
}) {
  const stats = [
    { value: articles, label: "技术文章" },
    { value: projects, label: "公开项目" },
    {
      value: homeProfile.githubContributions ?? "—",
      label:
        homeProfile.githubContributions === null
          ? "GitHub 提交 · 待接入"
          : "GitHub 提交",
    },
    { value: homeProfile.startedYear, label: "开始记录" },
  ];
  return (
    <section className="bento-card home-hero" aria-labelledby="home-title">
      <img
        className="hero-landscape"
        src={homeProfile.heroImage}
        alt=""
        width={1536}
        height={864}
        fetchPriority="high"
      />
      <div className="hero-eyebrow">
        <span>技术 · 思考 · 记录 · 成长</span>
        <span>持续学习 · 持续构建 · 持续成长</span>
      </div>
      <h1 id="home-title">{homeProfile.brand}</h1>
      <p className="hero-slogan">{homeProfile.slogan}</p>
      <p className="hero-english">{homeProfile.englishSlogan}</p>
      <div className="hero-actions">
        <Link className="home-button primary" href="/articles">
          阅读最新文章 <Icon name="arrow" size={16} />
        </Link>
        <Link className="home-button" href="/projects">
          <Icon name="github" size={18} />
          查看我的项目
        </Link>
      </div>
      <dl className="hero-stats">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt>{stat.value}</dt>
            <dd>{stat.label}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function RecentArticles({ articles }: { articles: PostListItem[] }) {
  return (
    <section className="bento-card home-recent" aria-label="近期文章">
      <SectionHeader title="近期文章" href="/articles" />
      <div className="recent-list">
        {articles.slice(0, 3).map((article, index) => (
          <article className="recent-item" key={article.id}>
            <Link
              className={`recent-cover cover-${index}`}
              href={`/articles/${article.slug}`}
              aria-label={`阅读：${article.title}`}
            >
              <img
                src={
                  article.cover
                    ? `/api/v1/media/${article.cover.storage_key}?width=480&format=webp`
                    : articleFallbackCovers[index]
                }
                alt=""
                width={82}
                height={82}
                loading="lazy"
                decoding="async"
              />
            </Link>
            <div>
              <div className="recent-meta">
                <span className="category-badge">{article.category}</span>
                <time dateTime={article.published_at ?? undefined}>
                  {formatDate(article.published_at)}
                </time>
              </div>
              <h3>
                <Link href={`/articles/${article.slug}`}>{article.title}</Link>
              </h3>
              <p>{article.summary}</p>
              <span className="recent-reading">
                <Icon name="clock" size={13} />
                {article.reading_time} 分钟阅读
              </span>
            </div>
          </article>
        ))}
        {!articles.length && (
          <p className="empty-state">文章正在整理，发布后会在这里显示。</p>
        )}
      </div>
    </section>
  );
}

export function CurrentStatus() {
  const percent = Math.round(
    (learningPlan.completed / learningPlan.target) * 100,
  );
  return (
    <section className="bento-card home-status" aria-label="当前状态">
      <SectionHeader title="当前状态">
        <span className="source-label">{learningPlan.sourceLabel}</span>
      </SectionHeader>
      <div className="status-ring-row">
        <div
          className="progress-ring"
          role="img"
          aria-label={`本周学习计划示例：${percent}%`}
        >
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle
              className="ring-track"
              cx="50"
              cy="50"
              r="43"
              fill="none"
              strokeWidth="9"
            />
            <circle
              className="ring-value"
              cx="50"
              cy="50"
              r="43"
              fill="none"
              strokeWidth="9"
              pathLength="100"
              strokeDasharray={`${percent} 100`}
              strokeLinecap="round"
            />
          </svg>
          <strong>{percent}%</strong>
        </div>
        <div className="status-ring-copy">
          <strong>本周学习进度</strong>
          <p>
            {learningPlan.completed} / {learningPlan.target} 小时
          </p>
        </div>
      </div>
      <div className="status-items" aria-label="每日计划示例">
        {learningPlan.items.map((item) => (
          <div className="status-item" key={item.name}>
            <span className={`status-icon tone-${item.tone}`}>
              <Icon name={item.icon} size={12} />
            </span>
            <span>{item.name}</span>
            <span>
              {item.done} / {item.target} h
            </span>
          </div>
        ))}
      </div>
      <p className="status-quote">路虽远，行则将至。</p>
    </section>
  );
}
