/* Native images use the existing FastAPI variants or precompressed local WebP assets. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SectionHeader } from "./CoreCards";
import { formatProjectPeriod, type Project } from "@/lib/api";

function ProjectPreview() {
  return (
    <div
      className="engineering-preview"
      aria-label="工程测试界面示意，非项目实际截图"
      role="img"
    >
      <div className="preview-toolbar">
        <span className="preview-mark">◈</span>
        <b>INTERFACE LAB</b>
        <span className="preview-live">SANDBOX</span>
      </div>
      <div className="preview-workspace">
        <div className="preview-nav">
          <span>◈</span>
          <span>▤</span>
          <span>◷</span>
          <span>⚙</span>
        </div>
        <div className="preview-content">
          <div className="preview-heading">
            <b>Protocol workspace</b>
            <span>SIMULATION</span>
          </div>
          <div className="preview-metrics">
            <span>
              Channels<b>04</b>
            </span>
            <span>
              Frames<b>128</b>
            </span>
            <span>
              Passed<b>100%</b>
            </span>
          </div>
          <div className="preview-table">
            <div>
              <span>CHANNEL</span>
              <span>PROTOCOL</span>
              <span>STATUS</span>
            </div>
            {["TCP", "UDP", "CAN", "ARINC429"].map((protocol, i) => (
              <div key={protocol}>
                <span>CH_0{i + 1}</span>
                <span>{protocol}</span>
                <span className="preview-pass">● Ready</span>
              </div>
            ))}
          </div>
          <div className="preview-wave">
            <svg viewBox="0 0 240 30" preserveAspectRatio="none">
              <path
                d="M0 20h15V7h22v14h15V7h27v14h17V7h24v14h17V7h27v14h14V7h26v14h16V7h20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

type FeaturedProjectData = Pick<
  Project,
  | "title"
  | "slug"
  | "summary"
  | "status"
  | "tags"
  | "cover"
  | "repo_url"
  | "started_at"
  | "ended_at"
>;

export function FeaturedProject({
  project,
}: {
  project: FeaturedProjectData | null;
}) {
  return (
    <section className="bento-card home-project" aria-label="精选项目">
      <SectionHeader title="Featured Project" href="/projects" />
      {project ? (
        <>
          <div
            className={`featured-visual${project.cover ? " has-project-cover" : ""}`}
          >
            {project.cover && (
              <img
                className="project-cover"
                src={`/api/v1/media/${project.cover.storage_key}?width=960&format=webp`}
                alt=""
                width={960}
                height={480}
                loading="lazy"
              />
            )}
            <div className="featured-copy">
              <span className="project-eyebrow">
                ENGINEERING / SELECTED WORK
              </span>
              <h3>
                <Link href={`/projects/${project.slug}`}>{project.title}</Link>
              </h3>
              <p>{project.summary}</p>
              <div className="project-tags">
                {project.tags.slice(0, 4).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
            {!project.cover && <ProjectPreview />}
            {!project.cover && (
              <span className="preview-disclaimer">概念界面 · 非实际截图</span>
            )}
          </div>
          <div className="featured-footer">
            <div className="project-actions">
              <Link
                className="home-button primary"
                href={`/projects/${project.slug}`}
              >
                查看项目 <Icon name="arrow" size={15} />
              </Link>
              {project.repo_url ? (
                <a
                  className="home-button"
                  href={project.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="github" size={17} />
                  GitHub
                </a>
              ) : (
                <span className="repository-unavailable">
                  <Icon name="github" size={16} />
                  仓库未公开
                </span>
              )}
            </div>
            <div className="project-facts">
              <span>
                <Icon name="star" size={15} />
                <b>—</b>
                <small>Stars 未接入</small>
              </span>
              <span>
                <Icon name="branch" size={15} />
                <b>—</b>
                <small>Forks 未接入</small>
              </span>
              <span>
                <b>{project.status}</b>
                <small>
                  {formatProjectPeriod(project.started_at, project.ended_at)}
                </small>
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <h3>项目正在整理</h3>
          <p>公开案例发布后会出现在这里。</p>
          <Link href="/articles">先阅读技术文章 →</Link>
        </div>
      )}
    </section>
  );
}
