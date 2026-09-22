import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MarkdownContent } from "@/components/MarkdownContent";
import { ZoomableImage } from "@/components/ZoomableImage";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
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
  title,
  source,
}: {
  id: string;
  title: string;
  source: string;
}) {
  if (!source) return null;
  return (
    <section className="case-section" id={id}>
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
  const sections = [
    { id: "background", title: "背景", source: project.background_md },
    { id: "problem", title: "问题与限制", source: project.problem_md },
    { id: "role", title: "职责", source: project.role_md },
    { id: "architecture", title: "架构", source: project.architecture_md },
    { id: "challenges", title: "难点", source: project.challenges_md },
    { id: "solution", title: "方案与取舍", source: [project.solutions_md, project.features_md].filter(Boolean).join("\n\n") },
    { id: "validation", title: "验证与结果", source: project.outcomes_md },
    { id: "next", title: "复盘", source: project.next_steps_md },
  ].filter((section) => section.source);

  return (
    <div className="section-shell project-detail page-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: projectJsonLd }} />
      <Breadcrumbs section="项目" href="/projects" title={project.title} />
      <header>
        <div className="project-meta">
          <span>{project.status}</span>
          <span>{period}</span>
        </div>
        <h1>{project.title}</h1>
        <p>{project.summary}</p>
        {project.tags.length ? (
          <div className="tag-row">
            {project.tags.map((item) => <span key={item}>{item}</span>)}
          </div>
        ) : null}
        {project.cover ? (
          <ZoomableImage
            src={`/api/v1/media/${project.cover.storage_key}`}
            alt={project.cover.alt_text ?? project.title}
            width={project.cover.width}
            height={project.cover.height}
            sizes="(max-width: 900px) 100vw, 720px"
          />
        ) : null}
      </header>
      <dl className="project-meta-list">
        <div><span>状态</span><strong>{project.status}</strong></div>
        <div><span>周期</span><strong>{period || "持续维护"}</strong></div>
        <div><span>保密</span><strong>{project.confidentiality_note || "使用脱敏与模拟资料"}</strong></div>
      </dl>
      {sections.length ? (
        <nav className="case-nav" aria-label="案例章节">
          {sections.map((section) => (
            <a href={`#${section.id}`} key={section.id}>{section.title}</a>
          ))}
        </nav>
      ) : null}
      <div className="case-study-body">
        {sections.map((section) => (
          <ProjectSection key={section.id} id={section.id} title={section.title} source={section.source} />
        ))}
      </div>
      {project.screenshots.length ? (
        <section className="case-section">
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
          <h2>关联文章</h2>
          <div className="related-links">
            {project.related_posts.map((post) => (
              <Link href={`/articles/${post.slug}`} key={post.id}>{post.title}</Link>
            ))}
          </div>
        </section>
      ) : null}
      {project.repo_url || project.demo_url ? (
        <section className="follow-up">
          <div>
            <h2>项目链接</h2>
            <p>公开仓库或演示入口。</p>
          </div>
          <div className="hero-actions">
            {project.repo_url ? <a className="button secondary" href={project.repo_url}>代码仓库</a> : null}
            {project.demo_url ? <a className="button secondary" href={project.demo_url}>在线演示</a> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
