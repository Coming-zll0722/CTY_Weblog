"use client";

import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import type { Post, Project } from "@/lib/api";
import {
  type AdminMedia,
  adminRequest,
  emptyPost,
  emptyProject,
  parseIds,
  type Taxonomy,
} from "@/components/admin/shared";

const MarkdownPreview = lazy(() =>
  import("@/components/MarkdownContent").then((module) => ({
    default: module.MarkdownContent,
  })),
);

type ManagerProps = {
  csrf: string;
  onError: (message: string) => void;
};

function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}

export function PostManager({ csrf, onError }: ManagerProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState<Post | null>(null);
  const [draft, setDraft] = useState(emptyPost);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const [categories, setCategories] = useState<Taxonomy[]>([]);
  const [tags, setTags] = useState<Taxonomy[]>([]);
  const [media, setMedia] = useState<AdminMedia[]>([]);
  const dirty = JSON.stringify(draft) !== lastSaved
    && Boolean(editing || draft.title || draft.content_md);
  useUnsavedWarning(dirty);

  const load = useCallback(async () => {
    try {
      const data = await adminRequest<Post[]>(
        "/admin/posts?page_size=100&include_deleted=true",
      );
      setPosts(data);
    } catch (caught) {
      onError((caught as Error).message);
    }
  }, [onError]);

  useEffect(() => {
    let active = true;
    Promise.all([
      adminRequest<Post[]>("/admin/posts?page_size=100&include_deleted=true"),
      adminRequest<Taxonomy[]>("/categories"),
      adminRequest<Taxonomy[]>("/tags"),
      adminRequest<AdminMedia[]>("/admin/media"),
    ])
      .then(([data, categoryItems, tagItems, mediaItems]) => {
        if (active) {
          setPosts(data);
          setCategories(categoryItems);
          setTags(tagItems);
          setMedia(mediaItems);
        }
      })
      .catch((caught) => {
        if (active) onError((caught as Error).message);
      });
    return () => {
      active = false;
    };
  }, [onError]);

  const edit = (post: Post) => {
    setEditing(post);
    const values = {
      title: post.title,
      slug: post.slug,
      summary: post.summary,
      content_md: post.content_md,
      confidentiality_checked: post.confidentiality_checked,
      cover_media_id: post.cover_media_id ?? "",
      category_id: post.category_id ?? "",
      tag_ids: post.tag_ids.join(", "),
      seo_title: post.seo_title ?? "",
      seo_description: post.seo_description ?? "",
      status: post.status,
    };
    setDraft(values);
    setLastSaved(JSON.stringify(values));
  };

  useEffect(() => {
    const snapshot = JSON.stringify(draft);
    if (!editing || saving || snapshot === lastSaved) return;
    const timer = window.setTimeout(() => {
      adminRequest<Post>(
        `/admin/posts/${editing.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...draft,
            cover_media_id: draft.cover_media_id || null,
            category_id: draft.category_id || null,
            tag_ids: parseIds(draft.tag_ids),
            seo_title: draft.seo_title || null,
            seo_description: draft.seo_description || null,
            version: editing.version,
          }),
        },
        csrf,
      )
        .then((saved) => {
          setEditing(saved);
          setLastSaved(snapshot);
          void load();
        })
        .catch((caught) => onError((caught as Error).message));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [csrf, draft, editing, lastSaved, load, onError, saving]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...draft,
        cover_media_id: draft.cover_media_id || null,
        category_id: draft.category_id || null,
        tag_ids: parseIds(draft.tag_ids),
        seo_title: draft.seo_title || null,
        seo_description: draft.seo_description || null,
        ...(editing ? { version: editing.version } : {}),
      };
      const saved = editing
        ? await adminRequest<Post>(
            `/admin/posts/${editing.id}`,
            { method: "PATCH", body: JSON.stringify(payload) },
            csrf,
          )
        : await adminRequest<Post>(
            "/admin/posts",
            { method: "POST", body: JSON.stringify(payload) },
            csrf,
          );
      setEditing(saved);
      const savedDraft = {
        title: saved.title,
        slug: saved.slug,
        summary: saved.summary,
        content_md: saved.content_md,
        confidentiality_checked: saved.confidentiality_checked,
        cover_media_id: saved.cover_media_id ?? "",
        category_id: saved.category_id ?? "",
        tag_ids: saved.tag_ids.join(", "),
        seo_title: saved.seo_title ?? "",
        seo_description: saved.seo_description ?? "",
        status: saved.status,
      };
      setDraft(savedDraft);
      setLastSaved(JSON.stringify(savedDraft));
      await load();
      onError("");
    } catch (caught) {
      onError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!editing) return;
    try {
      const published = await adminRequest<Post>(
        `/admin/posts/${editing.id}/publish`,
        {
          method: "POST",
          body: JSON.stringify({
            version: editing.version,
            publish_at: publishAt ? new Date(publishAt).toISOString() : null,
          }),
        },
        csrf,
      );
      setEditing(published);
      await load();
    } catch (caught) {
      onError((caught as Error).message);
    }
  };

  const remove = async (post: Post) => {
    if (!window.confirm(`将“${post.title}”移入回收站？`)) return;
    try {
      await adminRequest<void>(
        `/admin/posts/${post.id}`,
        { method: "DELETE" },
        csrf,
      );
      if (editing?.id === post.id) {
        setEditing(null);
        setDraft(emptyPost);
      }
      await load();
    } catch (caught) {
      onError((caught as Error).message);
    }
  };

  const restore = async (post: Post) => {
    try {
      await adminRequest<Post>(
        `/admin/posts/${post.id}/restore`,
        { method: "POST" },
        csrf,
      );
      await load();
      onError("");
    } catch (caught) {
      onError((caught as Error).message);
    }
  };

  return (
    <div className="admin-manager">
      <div className="admin-list">
        <div className="admin-list-head">
          <h3>文章</h3>
          <button onClick={() => {
            setEditing(null);
            setDraft(emptyPost);
            setLastSaved("");
          }}>
            新建
          </button>
        </div>
        {posts.map((post) => (
          <div className={editing?.id === post.id ? "selected" : ""} key={post.id}>
            <button onClick={() => {
              if (!post.deleted_at) edit(post);
            }}>
              <b>{post.title}</b>
              <span>{post.deleted_at ? "回收站" : post.status} · v{post.version}</span>
            </button>
            {post.deleted_at ? (
              <button aria-label={`恢复 ${post.title}`} onClick={() => restore(post)}>↺</button>
            ) : (
              <button aria-label={`删除 ${post.title}`} onClick={() => remove(post)}>×</button>
            )}
          </div>
        ))}
      </div>
      <div className="admin-editor">
        <p className="admin-save-state" role="status" aria-live="polite">
          {saving ? "正在保存…" : dirty ? "有尚未保存的修改" : editing ? "全部修改已保存" : "新建草稿"}
        </p>
        <label>标题<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label>Slug<input value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} /></label>
        <label>摘要<textarea rows={3} value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} /></label>
        <label>封面图片<select value={draft.cover_media_id} onChange={(event) => setDraft({ ...draft, cover_media_id: event.target.value })}><option value="">不使用封面</option>{media.map((item) => <option value={item.id} key={item.id}>{item.alt_text || item.original_name}</option>)}</select></label>
        <label>分类<select value={draft.category_id} onChange={(event) => setDraft({ ...draft, category_id: event.target.value })}><option value="">未分类</option>{categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label>标签（可多选）<select multiple value={parseIds(draft.tag_ids)} onChange={(event) => setDraft({ ...draft, tag_ids: [...event.target.selectedOptions].map((option) => option.value).join(", ") })}>{tags.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label>SEO 标题<input value={draft.seo_title} onChange={(event) => setDraft({ ...draft, seo_title: event.target.value })} /></label>
        <label>SEO 描述<textarea rows={2} value={draft.seo_description} onChange={(event) => setDraft({ ...draft, seo_description: event.target.value })} /></label>
        <label>状态<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="draft">草稿</option><option value="archived">归档</option><option value="published">已发布</option></select></label>
        <label>Markdown<textarea className="markdown-editor" rows={18} value={draft.content_md} onChange={(event) => setDraft({ ...draft, content_md: event.target.value })} /></label>
        <label className="check-row">
          <input type="checkbox" checked={draft.confidentiality_checked} onChange={(event) => setDraft({ ...draft, confidentiality_checked: event.target.checked })} />
          已完成发布前保密检查
        </label>
        <div className="admin-actions">
          <button className="button primary" onClick={save} disabled={saving}>{saving ? "保存中…" : "保存草稿"}</button>
          {editing ? <input aria-label="计划发布时间" type="datetime-local" value={publishAt} onChange={(event) => setPublishAt(event.target.value)} /> : null}
          {editing ? <button className="button secondary" onClick={publish}>发布</button> : null}
        </div>
        <div className="admin-preview">
          <h3>实时预览</h3>
          <div className="prose">
            <Suspense fallback={<p>正在生成预览…</p>}>
              <MarkdownPreview source={draft.content_md || "开始编写 Markdown…"} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectManager({ csrf, onError }: ManagerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Project | null>(null);
  const [draft, setDraft] = useState(emptyProject);
  const [tags, setTags] = useState<Taxonomy[]>([]);
  const [media, setMedia] = useState<AdminMedia[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [lastSaved, setLastSaved] = useState(JSON.stringify(emptyProject));
  const dirty = JSON.stringify(draft) !== lastSaved;
  useUnsavedWarning(dirty);

  const load = useCallback(async () => {
    try {
      setProjects(await adminRequest<Project[]>(
        "/admin/projects?page_size=100&include_deleted=true",
      ));
    } catch (caught) {
      onError((caught as Error).message);
    }
  }, [onError]);

  useEffect(() => {
    let active = true;
    Promise.all([
      adminRequest<Project[]>("/admin/projects?page_size=100&include_deleted=true"),
      adminRequest<Taxonomy[]>("/tags"),
      adminRequest<AdminMedia[]>("/admin/media"),
      adminRequest<Post[]>("/admin/posts?page_size=100"),
    ])
      .then(([data, tagItems, mediaItems, postItems]) => {
        if (active) {
          setProjects(data);
          setTags(tagItems);
          setMedia(mediaItems);
          setPosts(postItems);
        }
      })
      .catch((caught) => {
        if (active) onError((caught as Error).message);
      });
    return () => {
      active = false;
    };
  }, [onError]);

  const edit = (project: Project) => {
    setEditing(project);
    const values = {
      title: project.title,
      slug: project.slug,
      summary: project.summary,
      content_md: project.content_md,
      background_md: project.background_md,
      problem_md: project.problem_md,
      role_md: project.role_md,
      architecture_md: project.architecture_md,
      features_md: project.features_md,
      challenges_md: project.challenges_md,
      solutions_md: project.solutions_md,
      outcomes_md: project.outcomes_md,
      next_steps_md: project.next_steps_md,
      confidentiality_note: project.confidentiality_note,
      status: project.status,
      is_public: project.is_public,
      confidentiality_checked: project.confidentiality_checked,
      featured: project.featured,
      sort_order: project.sort_order,
      started_at: project.started_at ?? "",
      ended_at: project.ended_at ?? "",
      repo_url: project.repo_url ?? "",
      demo_url: project.demo_url ?? "",
      cover_media_id: project.cover_media_id ?? "",
      screenshot_media_ids: project.screenshot_media_ids.join(", "),
      related_post_ids: project.related_post_ids.join(", "),
      tag_ids: project.tag_ids.join(", "),
    };
    setDraft(values);
    setLastSaved(JSON.stringify(values));
  };

  const save = async () => {
    try {
      const payload = {
        ...draft,
        started_at: draft.started_at || null,
        ended_at: draft.ended_at || null,
        repo_url: draft.repo_url || null,
        demo_url: draft.demo_url || null,
        cover_media_id: draft.cover_media_id || null,
        screenshot_media_ids: parseIds(draft.screenshot_media_ids),
        related_post_ids: parseIds(draft.related_post_ids),
        tag_ids: parseIds(draft.tag_ids),
        ...(editing ? { version: editing.version } : {}),
      };
      const saved = editing
        ? await adminRequest<Project>(
            `/admin/projects/${editing.id}`,
            { method: "PATCH", body: JSON.stringify(payload) },
            csrf,
          )
        : await adminRequest<Project>(
            "/admin/projects",
            { method: "POST", body: JSON.stringify(payload) },
            csrf,
          );
      edit(saved);
      await load();
      onError("");
    } catch (caught) {
      onError((caught as Error).message);
    }
  };

  const remove = async (project: Project) => {
    if (!window.confirm(`将“${project.title}”移入回收站？`)) return;
    try {
      await adminRequest<void>(
        `/admin/projects/${project.id}`,
        { method: "DELETE" },
        csrf,
      );
      if (editing?.id === project.id) {
        setEditing(null);
        setDraft(emptyProject);
      }
      await load();
    } catch (caught) {
      onError((caught as Error).message);
    }
  };

  const restore = async (project: Project) => {
    try {
      await adminRequest<Project>(
        `/admin/projects/${project.id}/restore`,
        { method: "POST" },
        csrf,
      );
      await load();
    } catch (caught) {
      onError((caught as Error).message);
    }
  };

  return (
    <div className="admin-manager">
      <div className="admin-list">
        <div className="admin-list-head">
          <h3>项目</h3>
          <button onClick={() => {
            setEditing(null);
            setDraft(emptyProject);
            setLastSaved(JSON.stringify(emptyProject));
          }}>
            新建
          </button>
        </div>
        {projects.map((project) => (
          <div className={editing?.id === project.id ? "selected" : ""} key={project.id}>
            <button onClick={() => {
              if (!project.deleted_at) edit(project);
            }}>
              <b>{project.title}</b>
              <span>{project.deleted_at ? "回收站" : project.status} · v{project.version}</span>
            </button>
            {project.deleted_at ? (
              <button aria-label={`恢复 ${project.title}`} onClick={() => restore(project)}>↺</button>
            ) : (
              <button aria-label={`删除 ${project.title}`} onClick={() => remove(project)}>×</button>
            )}
          </div>
        ))}
      </div>
      <div className="admin-editor">
        <p className="admin-save-state" role="status" aria-live="polite">
          {dirty ? "有尚未保存的修改" : editing ? "全部修改已保存" : "新建项目"}
        </p>
        <h3>{editing ? "编辑项目" : "新建项目"}</h3>
        <label>名称<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label>Slug<input value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} /></label>
        <label>摘要<textarea rows={3} value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} /></label>
        <label>概览 Markdown<textarea rows={6} value={draft.content_md} onChange={(event) => setDraft({ ...draft, content_md: event.target.value })} /></label>
        {([
          ["background_md", "背景"],
          ["problem_md", "解决的问题"],
          ["role_md", "我的职责"],
          ["architecture_md", "系统架构"],
          ["features_md", "核心功能"],
          ["challenges_md", "技术难点"],
          ["solutions_md", "解决方案"],
          ["outcomes_md", "项目成果"],
          ["next_steps_md", "后续计划"],
        ] as const).map(([field, label]) => (
          <label key={field}>{label}<textarea rows={3} value={draft[field]} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })} /></label>
        ))}
        <label>状态<input value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} /></label>
        <label>开始日期<input type="date" value={draft.started_at} onChange={(event) => setDraft({ ...draft, started_at: event.target.value })} /></label>
        <label>结束日期<input type="date" value={draft.ended_at} onChange={(event) => setDraft({ ...draft, ended_at: event.target.value })} /></label>
        <label>代码仓库<input type="url" value={draft.repo_url} onChange={(event) => setDraft({ ...draft, repo_url: event.target.value })} /></label>
        <label>演示地址<input type="url" value={draft.demo_url} onChange={(event) => setDraft({ ...draft, demo_url: event.target.value })} /></label>
        <label>封面图片<select value={draft.cover_media_id} onChange={(event) => setDraft({ ...draft, cover_media_id: event.target.value })}><option value="">不使用封面</option>{media.map((item) => <option value={item.id} key={item.id}>{item.alt_text || item.original_name}</option>)}</select></label>
        <label>项目截图（可多选）<select multiple value={parseIds(draft.screenshot_media_ids)} onChange={(event) => setDraft({ ...draft, screenshot_media_ids: [...event.target.selectedOptions].map((option) => option.value).join(", ") })}>{media.map((item) => <option value={item.id} key={item.id}>{item.alt_text || item.original_name}</option>)}</select></label>
        <label>关联文章（可多选）<select multiple value={parseIds(draft.related_post_ids)} onChange={(event) => setDraft({ ...draft, related_post_ids: [...event.target.selectedOptions].map((option) => option.value).join(", ") })}>{posts.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
        <label>标签（可多选）<select multiple value={parseIds(draft.tag_ids)} onChange={(event) => setDraft({ ...draft, tag_ids: [...event.target.selectedOptions].map((option) => option.value).join(", ") })}>{tags.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label>排序<input type="number" value={draft.sort_order} onChange={(event) => setDraft({ ...draft, sort_order: Number(event.target.value) })} /></label>
        <label>保密说明<textarea rows={2} value={draft.confidentiality_note} onChange={(event) => setDraft({ ...draft, confidentiality_note: event.target.value })} /></label>
        <label className="check-row">
          <input type="checkbox" checked={draft.confidentiality_checked} onChange={(event) => setDraft({ ...draft, confidentiality_checked: event.target.checked })} />
          已完成项目公开前保密检查
        </label>
        <label className="check-row">
          <input type="checkbox" checked={draft.is_public} onChange={(event) => setDraft({ ...draft, is_public: event.target.checked })} />
          允许在公开项目页展示
        </label>
        <label className="check-row">
          <input type="checkbox" checked={draft.featured} onChange={(event) => setDraft({ ...draft, featured: event.target.checked })} />
          首页精选项目
        </label>
        <button className="button primary" onClick={save}>{editing ? "保存项目" : "创建项目"}</button>
      </div>
    </div>
  );
}
