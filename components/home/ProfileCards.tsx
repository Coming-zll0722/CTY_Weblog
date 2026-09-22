import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { goals, homeProfile, techStack } from "@/data/home";
import {
  formatDate,
  type PostListItem,
  type ProjectListItem,
  type TimelineEvent,
} from "@/lib/api";
import { SectionHeader } from "./CoreCards";

export function TechStack() {
  return (
    <section className="bento-card home-stack" aria-label="技术栈">
      <SectionHeader title="技术栈">
        <Link href="/stack" aria-label="查看完整技术栈">
          <Icon name="arrow" size={16} />
        </Link>
      </SectionHeader>
      <div className="tech-groups">
        {techStack.map((group) => (
          <div key={group.title}>
            <h3>{group.title}</h3>
            <div className="tech-items">
              {group.items.map((item) => (
                <div key={item.name}>
                  <span className={`tech-mark tech-${item.tone}`}>
                    {item.mark === "chip" || item.mark === "code" ? (
                      <Icon name={item.mark} size={25} />
                    ) : (
                      item.mark
                    )}
                  </span>
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Goals() {
  return (
    <section className="bento-card home-goals" aria-label="我的目标">
      <SectionHeader title="我的目标" />
      <div className="goal-list">
        {goals.map((goal) => (
          <div key={goal.title}>
            <span className={`goal-icon tone-${goal.tone}`}>
              <Icon name={goal.icon} size={19} />
            </span>
            <div>
              <h3>{goal.title}</h3>
              <p>{goal.description}</p>
            </div>
            <span className="goal-status">进行中</span>
          </div>
        ))}
      </div>
    </section>
  );
}

type Activity = {
  id: string;
  title: string;
  description: string;
  date: string;
  href: string;
  icon: IconName;
  action: string;
};
export function ActivityFeed({
  articles,
  projects,
  timeline,
}: {
  articles: PostListItem[];
  projects: ProjectListItem[];
  timeline: TimelineEvent[];
}) {
  const activities: Activity[] = [
    ...articles
      .filter((article) => article.published_at)
      .map(
        (article): Activity => ({
          id: `post-${article.id}`,
          title: `发布了新文章：${article.title}`,
          description: article.summary,
          date: article.published_at!,
          href: `/articles/${article.slug}`,
          icon: "article",
          action: "阅读",
        }),
      ),
    ...projects.map(
      (project): Activity => ({
        id: `project-${project.id}`,
        title: `更新了项目：${project.title}`,
        description: project.summary,
        date: project.updated_at,
        href: `/projects/${project.slug}`,
        icon: "project",
        action: "查看",
      }),
    ),
    ...timeline.map(
      (event): Activity => ({
        id: `event-${event.id}`,
        title: event.title,
        description: event.description,
        date: event.event_date,
        href: "/timeline",
        icon: "note",
        action: "查看",
      }),
    ),
  ]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 3);
  return (
    <section className="bento-card home-activity" aria-label="最新动态">
      <SectionHeader title="最新动态">
        <Link href="/timeline" aria-label="查看时间轴">
          <Icon name="arrow" size={16} />
        </Link>
      </SectionHeader>
      <div className="activity-list">
        {activities.map((item, index) => (
          <div className="activity-item" key={item.id}>
            <span className={`activity-icon activity-${index}`}>
              <Icon name={item.icon} size={18} />
            </span>
            <div className="activity-copy">
              <div className="activity-title">
                <h3>{item.title}</h3>
                <time dateTime={item.date}>{formatDate(item.date)}</time>
              </div>
              <p>{item.description}</p>
            </div>
            <Link href={item.href} aria-label={`${item.action}：${item.title}`}>
              {item.action}
              <Icon name="arrow" size={12} />
            </Link>
          </div>
        ))}
        {!activities.length && <p className="empty-state">还没有公开动态。</p>}
      </div>
    </section>
  );
}

export function AboutCard() {
  return (
    <section className="bento-card home-about" aria-label="关于我">
      <SectionHeader title="关于我">
        <Link href="/about" aria-label="查看完整介绍">
          <Icon name="arrow" size={16} />
        </Link>
      </SectionHeader>
      <div className="about-card-body">
        <div className="about-avatar" aria-hidden="true">
          <span>{homeProfile.name}</span>
        </div>
        <div>
          <h3>{homeProfile.name}</h3>
          <p className="about-domain">从头越 · devlelin.xyz</p>
          <p className="about-description">{homeProfile.description}</p>
          <div className="about-facts">
            <span>
              <Icon name="pin" size={13} />
              {homeProfile.location}
            </span>
            <span>
              <Icon name="user" size={13} />
              {homeProfile.birthYear}
            </span>
            <span>“ 长期主义 ”</span>
          </div>
        </div>
      </div>
    </section>
  );
}
