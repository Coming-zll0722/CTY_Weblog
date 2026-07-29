import type { Metadata } from "next";
import { skillGroups } from "@/data/profile";

export const metadata: Metadata = {
  title: "技术栈",
  description: "技术能力、熟悉程度与实际使用场景。",
  alternates: { canonical: "/stack" },
};

export default function StackPage() {
  return (
    <div className="section-shell page-shell">
      <header className="page-heading">
        <p className="eyebrow">CAPABILITIES / 技术栈</p>
        <h1>按实际使用，而不是名词数量。</h1>
        <p>这里记录正在使用和持续学习的技术，以及它们在项目中的实际应用场景。</p>
      </header>
      <div className="stack-list">
        {skillGroups.map((group) => (
          <section key={group.title}>
            <div className="stack-title"><span>{group.no}</span><div><h2>{group.title}</h2><p>{group.description}</p></div></div>
            <div className="skill-bars">
              {group.skills.map((skill, index) => (
                <div key={skill}><span>{skill}</span><i><b style={{ width: `${88 - index * 8}%` }} /></i></div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
