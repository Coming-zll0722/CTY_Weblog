/* Native images use the existing FastAPI variants or precompressed local WebP assets. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SectionHeader } from "./CoreCards";
import { formatProjectPeriod, type Project } from "@/lib/api";

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
      <SectionHeader title="精选项目" href="/projects" />
      {project ? (
        <>
          <div
            className={`featured-visual${project.cover ? " has-project-cover" : " project-text-only"}`}
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
