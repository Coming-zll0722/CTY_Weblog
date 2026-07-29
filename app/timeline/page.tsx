import type { Metadata } from "next";
import { formatDate, getTimeline } from "@/lib/api";

export const metadata: Metadata = {
  title: "时间线",
  description: "学习、工作、项目与技术方向的持续记录。",
  alternates: { canonical: "/timeline" },
};

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const timeline = await getTimeline();
  return (
    <div className="section-shell page-shell timeline-page">
      <header className="page-heading">
        <p className="eyebrow">TIMELINE / 时间线</p>
        <h1>能力来自连续的积累。</h1>
        <p>记录学习、项目和技术方向的变化，也保留每个阶段尚未解决的问题。</p>
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
