"use client";

import { useCallback, useEffect, useState } from "react";
import { publicApiBase } from "@/lib/api";
import {
  type AdminMedia,
  adminRequest,
  type SiteLink,
  type Taxonomy,
  type TimelineItem,
} from "@/components/admin/shared";

type ManagerProps = {
  csrf: string;
  onError: (message: string) => void;
};

export function MediaManager({ csrf, onError }: ManagerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [message, setMessage] = useState("");
  const [media, setMedia] = useState<AdminMedia[]>([]);

  const load = useCallback(async () => {
    try {
      setMedia(await adminRequest("/admin/media"));
    } catch (caught) {
      onError((caught as Error).message);
    }
  }, [onError]);

  useEffect(() => {
    let active = true;
    adminRequest<AdminMedia[]>("/admin/media")
      .then((items) => {
        if (active) setMedia(items);
      })
      .catch((caught) => {
        if (active) onError((caught as Error).message);
      });
    return () => {
      active = false;
    };
  }, [onError]);

  const upload = async () => {
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    body.append("alt_text", altText);
    try {
      const saved = await adminRequest<{ original_name: string }>(
        "/admin/media",
        { method: "POST", body },
        csrf,
      );
      setMessage(`${saved.original_name} 上传成功。`);
      setFile(null);
      await load();
    } catch (caught) {
      onError((caught as Error).message);
    }
  };

  return (
    <div className="admin-editor compact-editor">
      <h3>上传图片</h3>
      <p>支持 JPEG、PNG、WebP、AVIF；服务端会校验扩展名、MIME、文件头和尺寸。</p>
      <label>图片<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
      <label>替代文本<input value={altText} onChange={(event) => setAltText(event.target.value)} /></label>
      <button className="button primary" onClick={upload} disabled={!file}>上传</button>
      {message ? <p>{message}</p> : null}
      <div className="media-grid">
        {media.map((item) => (
          <article key={item.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${publicApiBase}/media/${item.storage_key}`}
              alt={item.alt_text ?? item.original_name}
              loading="lazy"
            />
            <b>{item.original_name}</b>
            <small>{item.id}</small>
            <button
              onClick={async () => {
                if (!window.confirm(`删除“${item.original_name}”？`)) return;
                try {
                  await adminRequest<void>(
                    `/admin/media/${item.id}`,
                    { method: "DELETE" },
                    csrf,
                  );
                  await load();
                } catch (caught) {
                  onError((caught as Error).message);
                }
              }}
            >
              删除
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

export function TaxonomyManager({ csrf, onError }: ManagerProps) {
  const [categories, setCategories] = useState<Taxonomy[]>([]);
  const [tags, setTags] = useState<Taxonomy[]>([]);
  const [category, setCategory] = useState({ name: "", slug: "", description: "" });
  const [tag, setTag] = useState({ name: "", slug: "" });
  const [categoryEditing, setCategoryEditing] = useState<string | null>(null);
  const [tagEditing, setTagEditing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [categoryItems, tagItems] = await Promise.all([
        adminRequest<Taxonomy[]>("/categories"),
        adminRequest<Taxonomy[]>("/tags"),
      ]);
      setCategories(categoryItems);
      setTags(tagItems);
    } catch (caught) {
      onError((caught as Error).message);
    }
  }, [onError]);

  useEffect(() => {
    let active = true;
    Promise.all([
      adminRequest<Taxonomy[]>("/categories"),
      adminRequest<Taxonomy[]>("/tags"),
    ])
      .then(([categoryItems, tagItems]) => {
        if (active) {
          setCategories(categoryItems);
          setTags(tagItems);
        }
      })
      .catch((caught) => {
        if (active) onError((caught as Error).message);
      });
    return () => {
      active = false;
    };
  }, [onError]);

  const saveCategory = async () => {
    try {
      await adminRequest<Taxonomy>(
        categoryEditing ? `/admin/categories/${categoryEditing}` : "/admin/categories",
        { method: categoryEditing ? "PATCH" : "POST", body: JSON.stringify(category) },
        csrf,
      );
      setCategory({ name: "", slug: "", description: "" });
      setCategoryEditing(null);
      await load();
    } catch (caught) {
      onError((caught as Error).message);
    }
  };

  const saveTag = async () => {
    try {
      await adminRequest<Taxonomy>(
        tagEditing ? `/admin/tags/${tagEditing}` : "/admin/tags",
        { method: tagEditing ? "PATCH" : "POST", body: JSON.stringify(tag) },
        csrf,
      );
      setTag({ name: "", slug: "" });
      setTagEditing(null);
      await load();
    } catch (caught) {
      onError((caught as Error).message);
    }
  };

  const remove = async (type: "categories" | "tags", item: Taxonomy) => {
    if (!window.confirm(`删除“${item.name}”？`)) return;
    try {
      await adminRequest<void>(
        `/admin/${type}/${item.id}`,
        { method: "DELETE" },
        csrf,
      );
      await load();
    } catch (caught) {
      onError((caught as Error).message);
    }
  };

  return (
    <div className="management-grid">
      <section className="admin-editor">
        <h3>分类</h3>
        <label>名称<input value={category.name} onChange={(event) => setCategory({ ...category, name: event.target.value })} /></label>
        <label>Slug<input value={category.slug} onChange={(event) => setCategory({ ...category, slug: event.target.value })} /></label>
        <label>说明<input value={category.description} onChange={(event) => setCategory({ ...category, description: event.target.value })} /></label>
        <div className="admin-actions">
          <button className="button primary" onClick={saveCategory}>{categoryEditing ? "保存分类" : "新增分类"}</button>
          {categoryEditing ? <button className="button secondary" onClick={() => { setCategoryEditing(null); setCategory({ name: "", slug: "", description: "" }); }}>取消</button> : null}
        </div>
        <div className="management-list">
          {categories.map((item) => (
            <div key={item.id}>
              <span><b>{item.name}</b><small>{item.slug}</small></span>
              <span className="management-actions">
                <button onClick={() => { setCategoryEditing(item.id); setCategory({ name: item.name, slug: item.slug, description: item.description ?? "" }); }}>编辑</button>
                <button onClick={() => remove("categories", item)}>删除</button>
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="admin-editor">
        <h3>标签</h3>
        <label>名称<input value={tag.name} onChange={(event) => setTag({ ...tag, name: event.target.value })} /></label>
        <label>Slug<input value={tag.slug} onChange={(event) => setTag({ ...tag, slug: event.target.value })} /></label>
        <div className="admin-actions">
          <button className="button primary" onClick={saveTag}>{tagEditing ? "保存标签" : "新增标签"}</button>
          {tagEditing ? <button className="button secondary" onClick={() => { setTagEditing(null); setTag({ name: "", slug: "" }); }}>取消</button> : null}
        </div>
        <div className="management-list">
          {tags.map((item) => (
            <div key={item.id}>
              <span><b>{item.name}</b><small>{item.slug}</small></span>
              <span className="management-actions">
                <button onClick={() => { setTagEditing(item.id); setTag({ name: item.name, slug: item.slug }); }}>编辑</button>
                <button onClick={() => remove("tags", item)}>删除</button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function SiteManager({ csrf, onError }: ManagerProps) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [links, setLinks] = useState<SiteLink[]>([]);
  const [eventEditing, setEventEditing] = useState<string | null>(null);
  const [linkEditing, setLinkEditing] = useState<string | null>(null);
  const [event, setEvent] = useState({
    event_date: "",
    title: "",
    description: "",
    event_type: "growth",
    is_public: true,
    sort_order: 0,
  });
  const [link, setLink] = useState({
    name: "",
    url: "",
    description: "",
    status: "active",
    sort_order: 0,
  });

  const load = useCallback(async () => {
    try {
      const [timelineResponse, linkItems] = await Promise.all([
        adminRequest<TimelineItem[]>("/admin/timelines"),
        adminRequest<SiteLink[]>("/admin/links"),
      ]);
      setTimeline(timelineResponse);
      setLinks(linkItems);
    } catch (caught) {
      onError((caught as Error).message);
    }
  }, [onError]);

  useEffect(() => {
    let active = true;
    Promise.all([
      adminRequest<TimelineItem[]>("/admin/timelines"),
      adminRequest<SiteLink[]>("/admin/links"),
    ])
      .then(([timelineResponse, linkItems]) => {
        if (active) {
          setTimeline(timelineResponse);
          setLinks(linkItems);
        }
      })
      .catch((caught) => {
        if (active) onError((caught as Error).message);
      });
    return () => {
      active = false;
    };
  }, [onError]);

  const saveEvent = async () => {
    try {
      await adminRequest<TimelineItem>(
        eventEditing ? `/admin/timelines/${eventEditing}` : "/admin/timelines",
        { method: eventEditing ? "PATCH" : "POST", body: JSON.stringify(event) },
        csrf,
      );
      setEvent({ event_date: "", title: "", description: "", event_type: "growth", is_public: true, sort_order: 0 });
      setEventEditing(null);
      await load();
    } catch (caught) {
      onError((caught as Error).message);
    }
  };

  const saveLink = async () => {
    try {
      if (new URL(link.url).protocol !== "https:") throw new Error();
    } catch {
      onError("友情链接必须使用完整的 HTTPS 地址。");
      return;
    }
    try {
      await adminRequest<SiteLink>(
        linkEditing ? `/admin/links/${linkEditing}` : "/admin/links",
        {
          method: linkEditing ? "PATCH" : "POST",
          body: JSON.stringify({
            ...link,
            description: link.description || null,
          }),
        },
        csrf,
      );
      setLink({ name: "", url: "", description: "", status: "active", sort_order: 0 });
      setLinkEditing(null);
      await load();
    } catch (caught) {
      onError((caught as Error).message);
    }
  };

  const remove = async (
    type: "timelines" | "links",
    id: string,
    title: string,
  ) => {
    if (!window.confirm(`删除“${title}”？`)) return;
    try {
      await adminRequest<void>(
        `/admin/${type}/${id}`,
        { method: "DELETE" },
        csrf,
      );
      await load();
    } catch (caught) {
      onError((caught as Error).message);
    }
  };

  return (
    <div className="management-grid">
      <section className="admin-editor">
        <h3>时间线</h3>
        <label>日期<input type="date" value={event.event_date} onChange={(change) => setEvent({ ...event, event_date: change.target.value })} /></label>
        <label>标题<input value={event.title} onChange={(change) => setEvent({ ...event, title: change.target.value })} /></label>
        <label>说明<textarea rows={3} value={event.description} onChange={(change) => setEvent({ ...event, description: change.target.value })} /></label>
        <label>类型<input value={event.event_type} onChange={(change) => setEvent({ ...event, event_type: change.target.value })} /></label>
        <label>排序<input type="number" value={event.sort_order} onChange={(change) => setEvent({ ...event, sort_order: Number(change.target.value) })} /></label>
        <label className="check-row"><input type="checkbox" checked={event.is_public} onChange={(change) => setEvent({ ...event, is_public: change.target.checked })} />公开展示</label>
        <div className="admin-actions">
          <button className="button primary" onClick={saveEvent}>{eventEditing ? "保存事件" : "新增事件"}</button>
          {eventEditing ? <button className="button secondary" onClick={() => { setEventEditing(null); setEvent({ event_date: "", title: "", description: "", event_type: "growth", is_public: true, sort_order: 0 }); }}>取消</button> : null}
        </div>
        <div className="management-list">
          {timeline.map((item) => (
            <div key={item.id}>
              <span><b>{item.title}</b><small>{item.event_date} · {item.is_public ? "公开" : "隐藏"}</small></span>
              <span className="management-actions">
                <button onClick={() => { setEventEditing(item.id); setEvent({ event_date: item.event_date, title: item.title, description: item.description, event_type: item.event_type, is_public: item.is_public, sort_order: item.sort_order }); }}>编辑</button>
                <button onClick={() => remove("timelines", item.id, item.title)}>删除</button>
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="admin-editor">
        <h3>友情链接</h3>
        <label>名称<input value={link.name} onChange={(change) => setLink({ ...link, name: change.target.value })} /></label>
        <label>网址<input type="url" placeholder="https://…" value={link.url} onChange={(change) => setLink({ ...link, url: change.target.value })} /></label>
        <label>说明<input value={link.description} onChange={(change) => setLink({ ...link, description: change.target.value })} /></label>
        <label>状态<select value={link.status} onChange={(change) => setLink({ ...link, status: change.target.value })}><option value="active">启用</option><option value="hidden">隐藏</option></select></label>
        <label>排序<input type="number" value={link.sort_order} onChange={(change) => setLink({ ...link, sort_order: Number(change.target.value) })} /></label>
        <div className="admin-actions">
          <button className="button primary" onClick={saveLink}>{linkEditing ? "保存链接" : "新增链接"}</button>
          {linkEditing ? <button className="button secondary" onClick={() => { setLinkEditing(null); setLink({ name: "", url: "", description: "", status: "active", sort_order: 0 }); }}>取消</button> : null}
        </div>
        <div className="management-list">
          {links.map((item) => (
            <div key={item.id}>
              <span><b>{item.name}</b><small>{item.url}</small></span>
              <span className="management-actions">
                <button onClick={() => { setLinkEditing(item.id); setLink({ name: item.name, url: item.url, description: item.description ?? "", status: item.status, sort_order: item.sort_order }); }}>编辑</button>
                <button onClick={() => remove("links", item.id, item.name)}>删除</button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
