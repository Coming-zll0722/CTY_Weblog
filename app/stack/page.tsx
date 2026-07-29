import type { Metadata } from "next";
import { skillGroups } from "@/data/profile";

export const metadata: Metadata = {
  title: "技术地图",
  description: "围绕工程问题持续扩展的技术主题与研究路径。",
  alternates: { canonical: "/stack" },
};

export default function StackPage() {
  return (
    <div className="section-shell page-shell">
      <header className="page-heading">
        <p className="eyebrow">TECHNOLOGY MAP / 技术地图</p>
        <h1>技术不是清单，是彼此连接的问题。</h1>
        <p>这里不做熟练度排名，只整理长期关注的主题、它们解决的问题，以及仍在补全的知识边界。</p>
      </header>
      <div className="stack-list">
        {skillGroups.map((group) => (
          <section key={group.title}>
            <div className="stack-title"><span>TRACK / {group.no}</span><div><h2>{group.title}</h2><p>{group.description}</p></div></div>
            <div className="topic-tags">
              {group.skills.map((skill) => <span key={skill}>{skill}</span>)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
