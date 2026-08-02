import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MarkdownContent } from "@/components/MarkdownContent";
import { ZoomableImage } from "@/components/ZoomableImage";
import { ApiError, getProject, getPublicSettingsOrDefaults } from "@/lib/api";
import { absoluteSiteUrl } from "@/lib/site-origin";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const project = await getProject(slug);
    return {
      title: project.title,
      description: project.summary,
      alternates: { canonical: `/projects/${project.slug}` },
      openGraph: {
        type: "website",
        title: project.title,
        description: project.summary,
        images: project.cover ? [{
          url: `/api/v1/media/${project.cover.storage_key}`,
          width: project.cover.width ?? undefined,
          height: project.cover.height ?? undefined,
          alt: project.cover.alt_text ?? project.title,
        }] : undefined,
      },
    };
  } catch {
    return {};
  }
}

function ProjectSection({
  id,
  eyebrow,
  title,
  source,
}: {
  id: string;
  eyebrow: string;
  title: string;
  source: string;
}) {
  if (!source) return null;
  return (
    <section className="case-section" id={id}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <div className="prose"><MarkdownContent source={source} /></div>
    </section>
  );
}

export default async function ProjectDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let project;
  try {
    project = await getProject(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 301) redirect(error.message);
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const settings = await getPublicSettingsOrDefaults();
  const period = [project.started_at, project.ended_at ?? "至今"]
    .filter(Boolean)
    .join(" — ");
  const projectJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: project.title,
    description: project.summary,
    codeRepository: project.repo_url,
    url: project.demo_url,
    programmingLanguage: project.tags,
    image: project.cover
      ? absoluteSiteUrl(`/api/v1/media/${project.cover.storage_key}`)
      : undefined,
    author: { "@type": "Person", name: settings.authorName },
  }).replace(/</g, "\\u003c");

  return (
    <div className="section-shell project-detail page-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: projectJsonLd }} />
      <Link href="/projects" className="back-link">← 返回项目</Link>
      <header>
        <div className="project-meta"><span>{project.status}</span><span>{period}</span></div>
        <h1>{project.title}</h1>
        <p>{project.summary}</p>
        <div className="tag-row">
          {project.tags.map((item) => <span key={item}>{item}</span>)}
        </div>
        {project.cover ? (
          <ZoomableImage
            src={`/api/v1/media/${project.cover.storage_key}`}
            alt={project.cover.alt_text ?? project.title}
            width={project.cover.width}
            height={project.cover.height}
            sizes="(max-width: 900px) 100vw, 1120px"
          />
        ) : null}
      </header>
      <div className="project-facts">
        <div><span>项目状态</span><strong>{project.status}</strong></div>
        <div><span>起止时间</span><strong>{period || "持续维护"}</strong></div>
        <div><span>保密说明</span><strong>{project.confidentiality_note || "使用脱敏与模拟资料"}</strong></div>
      </div>
      <nav className="case-nav" aria-label="案例章节">
        <a href="#background">背景</a><a href="#problem">问题与限制</a><a href="#role">职责</a><a href="#architecture">架构</a><a href="#challenges">难点</a><a href="#solution">方案与取舍</a><a href="#validation">验证与结果</a><a href="#next">复盘</a>
      </nav>
      <div className="case-study-body">
        <ProjectSection id="background" eyebrow="01 / BACKGROUND" title="项目背景" source={project.background_md} />
        <ProjectSection id="problem" eyebrow="02 / PROBLEM & CONSTRAINTS" title="问题与限制" source={project.problem_md} />
        <ProjectSection id="role" eyebrow="03 / MY ROLE" title="我的职责" source={project.role_md} />
        <ProjectSection id="architecture" eyebrow="04 / ARCHITECTURE" title="架构与关键决策" source={project.architecture_md} />
        <ProjectSection id="challenges" eyebrow="05 / CHALLENGES" title="技术难点" source={project.challenges_md} />
        <ProjectSection id="solution" eyebrow="06 / TRADE-OFFS" title="方案、功能与取舍" source={[project.solutions_md, project.features_md].filter(Boolean).join("\n\n")} />
        <ProjectSection id="validation" eyebrow="07 / VALIDATION & OUTCOME" title="验证方法与结果" source={project.outcomes_md} />
        <ProjectSection id="next" eyebrow="08 / RETROSPECTIVE" title="复盘与后续计划" source={project.next_steps_md} />
      </div>
      {project.screenshots.length ? (
        <section className="case-section">
          <p className="eyebrow">GALLERY</p>
          <h2>项目截图</h2>
          <div className="project-gallery">
            {project.screenshots.map((image) => (
              <ZoomableImage
                key={image.id}
                src={`/api/v1/media/${image.storage_key}`}
                alt={image.alt_text ?? `${project.title} 截图`}
                width={image.width}
                height={image.height}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ))}
          </div>
        </section>
      ) : null}
      {project.related_posts.length ? (
        <section className="case-section">
          <p className="eyebrow">RELATED POSTS</p>
          <h2>关联文章</h2>
          <div className="management-list">
            {project.related_posts.map((post) => (
              <Link href={`/articles/${post.slug}`} key={post.id}>{post.title} ↗</Link>
            ))}
          </div>
        </section>
      ) : null}
      {project.repo_url || project.demo_url ? (
        <section className="contact-band">
          <div>
            <p className="eyebrow">PROJECT LINKS</p>
            <h2>进一步了解这个项目</h2>
          </div>
          <div className="hero-actions">
            {project.repo_url ? <a className="button inverted" href={project.repo_url}>代码仓库 ↗</a> : null}
            {project.demo_url ? <a className="button inverted" href={project.demo_url}>在线演示 ↗</a> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
