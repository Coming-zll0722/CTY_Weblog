import type { Metadata } from "next";
import Link from "next/link";
import { skillGroups } from "@/data/profile";

export const metadata: Metadata = {
  title: "能力地图",
  description: "按能力方向、真实使用场景、熟悉程度与当前边界组织的技术说明。",
  alternates: { canonical: "/stack" },
};

export default function StackPage() {
  return (
    <div className="section-shell page-shell stack-page">
      <header className="page-heading editorial-heading">
        <p className="eyebrow">CAPABILITY MAP / 能力地图</p>
        <h1>按解决问题的能力，<br />而不是名词数量。</h1>
        <p>技术熟悉度、实际使用场景和当前边界放在一起说明。这里不使用虚假的百分比进度条。</p>
      </header>
      <div className="stack-directory" aria-label="熟悉程度说明">
        <div><b>熟练使用</b><span>能够独立分析、实现并处理异常路径</span></div>
        <div><b>项目经验</b><span>在真实或完整个人项目中使用并验证</span></div>
        <div><b>正在学习</b><span>处于实验与知识补全阶段，不扩大表述</span></div>
      </div>
      <div className="stack-list editorial-stack">
        {skillGroups.map((group) => (
          <section id={`capability-${group.no}`} key={group.title}>
            <div className="stack-title">
              <span>{group.no}</span>
              <div><h2>{group.title}</h2><p>{group.description}</p></div>
            </div>
            <dl className="capability-detail">
              <div><dt>使用场景</dt><dd>{group.scenario}</dd></div>
              <div><dt>技术与阶段</dt><dd>{group.skills.map((skill) => <span key={skill.name}><b>{skill.name}</b><small>{skill.level}</small></span>)}</dd></div>
              <div><dt>当前边界</dt><dd>{group.boundary}</dd></div>
              <div><dt>相关内容</dt><dd><Link href={group.href}>进入项目或文章 ↗</Link></dd></div>
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
