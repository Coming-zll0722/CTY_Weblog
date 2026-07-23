import type { Metadata } from "next";
import { skillGroups } from "@/data/site";

export const metadata: Metadata = { title: "技术栈", description: "技术能力、熟悉程度与实际使用场景。" };

export default function StackPage() {
  return (
    <div className="section-shell page-shell">
      <header className="page-heading">
        <p className="eyebrow">CAPABILITIES / 技术栈</p>
        <h1>按实际使用，而不是名词数量。</h1>
        <p>“熟练”意味着能独立解决常见工程问题；“项目使用”意味着已在完整项目中实践；“学习中”代表正在建立系统理解。</p>
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
