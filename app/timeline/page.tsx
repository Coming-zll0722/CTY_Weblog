import type { Metadata } from "next";
import { formatDate, getTimeline } from "@/lib/api";

export const metadata: Metadata = {
  title: "时间线",
  description: "文章修订、项目迭代与学习方向的公开更新日志。",
  alternates: { canonical: "/timeline" },
};

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const timeline = await getTimeline();
  return (
    <div className="section-shell page-shell timeline-page">
      <header className="page-heading">
        <p className="eyebrow">CHANGELOG / 时间线</p>
        <h1>记录变化，也保留未完成。</h1>
        <p>这里是本站的公开更新日志：文章修订、项目迭代、实验进展，以及研究方向发生变化的原因。</p>
      </header>
      <div className="timeline">
        {timeline.map((event, index) => (
          <article key={event.id}>
            <time>{formatDate(event.event_date)}</time>
            <span className="timeline-dot">{String(index + 1).padStart(2, "0")}</span>
            <div><h2>{event.title}</h2><p>{event.description}</p></div>
          </article>
        ))}
        {!timeline.length ? (
          <div className="empty-state"><h2>暂无公开记录</h2><p>时间线事件公开后会显示在这里。</p></div>
        ) : null}
      </div>
    </div>
  );
}
