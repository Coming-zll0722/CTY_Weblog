import type { Metadata } from "next";
import { timeline } from "@/data/site";

export const metadata: Metadata = { title: "时间线", description: "学习、工作、项目与技术方向的持续记录。" };

export default function TimelinePage() {
  return (
    <div className="section-shell page-shell timeline-page">
      <header className="page-heading">
        <p className="eyebrow">TIMELINE / 时间线</p>
        <h1>能力来自连续的积累。</h1>
        <p>记录学习、工作、项目和技术方向的变化，也保留每个阶段尚未解决的问题。</p>
      </header>
      <div className="timeline">
        {timeline.map(([date, title, description], index) => (
          <article key={date}>
            <time>{date}</time>
            <span className="timeline-dot">{String(index + 1).padStart(2, "0")}</span>
            <div><h2>{title}</h2><p>{description}</p></div>
          </article>
        ))}
      </div>
    </div>
  );
}
