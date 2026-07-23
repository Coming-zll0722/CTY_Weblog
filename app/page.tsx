import Link from "next/link";
import { articles, projects, skillGroups } from "@/data/site";

export default function Home() {
  return (
    <>
      <section className="hero section-shell">
        <div className="hero-copy">
          <p className="eyebrow">Embedded Software Test Engineer</p>
          <h1>
            把复杂协议，变成
            <br />
            <span>可验证的工程系统。</span>
          </h1>
          <p className="hero-lead">
            我是林序，一名电子信息工程背景的软件工程师。专注嵌入式通信接口测试、
            自动化测试工具与可靠的软件工程实践。
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/projects">
              查看项目
            </Link>
            <Link className="button secondary" href="/about">
              了解我
            </Link>
          </div>
          <div className="status-line">
            <span className="status-dot" />
            当前：重构通信协议测试平台 · 学习 FPGA 时序分析
          </div>
        </div>

        <div className="hero-panel" aria-label="工作领域概览">
          <div className="terminal-head">
            <span>focus.yaml</span>
            <span>2026.07</span>
          </div>
          <div className="terminal-body">
            <p><b>role:</b> embedded_test_engineer</p>
            <p><b>interfaces:</b></p>
            <ul>
              <li>TCP / UDP / Serial</li>
              <li>CAN / RS422 / RS485</li>
              <li>1553B / ARINC 429</li>
            </ul>
            <p><b>practice:</b></p>
            <ul>
              <li>protocol_analysis</li>
              <li>test_automation</li>
              <li>tool_engineering</li>
            </ul>
          </div>
          <div className="signal-chart" aria-hidden="true">
            {[18, 30, 30, 12, 12, 38, 38, 22, 22, 46, 46, 28].map((h, i) => (
              <i key={i} style={{ height: `${h}px` }} />
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell stat-strip" aria-label="能力摘要">
        <div><strong>7+</strong><span>类通信接口</span></div>
        <div><strong>4</strong><span>门主要语言</span></div>
        <div><strong>6</strong><span>个工程项目</span></div>
        <div><strong>持续</strong><span>记录与复盘</span></div>
      </section>

      <section className="section-shell section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SELECTED WORK</p>
            <h2>把问题做成工具</h2>
          </div>
          <Link className="text-link" href="/projects">全部项目 →</Link>
        </div>
        <div className="project-grid">
          {projects.slice(0, 3).map((project, index) => (
            <Link className="project-card" href={`/projects/${project.slug}`} key={project.slug}>
              <div className="project-index">0{index + 1}</div>
              <div className="project-meta">
                <span>{project.status}</span>
                <span>{project.period}</span>
              </div>
              <h3>{project.title}</h3>
              <p>{project.summary}</p>
              <div className="tag-row">
                {project.stack.slice(0, 4).map((item) => <span key={item}>{item}</span>)}
              </div>
              <span className="card-arrow">↗</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-shell section-block two-column">
        <div>
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">WRITING</p>
              <h2>最近在写</h2>
            </div>
            <Link className="text-link" href="/articles">文章归档 →</Link>
          </div>
          <div className="article-list">
            {articles.slice(0, 4).map((article) => (
              <Link href={`/articles/${article.slug}`} className="article-row" key={article.slug}>
                <div>
                  <span className="article-category">{article.category}</span>
                  <h3>{article.title}</h3>
                  <p>{article.summary}</p>
                </div>
                <aside>
                  <time>{article.date}</time>
                  <span>{article.readingTime} 分钟</span>
                </aside>
              </Link>
            ))}
          </div>
        </div>

        <aside className="now-panel">
          <p className="eyebrow">NOW / Q3</p>
          <h2>正在推进</h2>
          <ol>
            <li>
              <span>01</span>
              <div><b>协议测试平台 2.0</b><p>统一测试执行、数据记录和报告生成。</p></div>
            </li>
            <li>
              <span>02</span>
              <div><b>FPGA 基础实验</b><p>从组合逻辑走向时序约束与仿真验证。</p></div>
            </li>
            <li>
              <span>03</span>
              <div><b>AI 辅助测试</b><p>研究需求到用例的可追溯生成流程。</p></div>
            </li>
          </ol>
        </aside>
      </section>

      <section className="section-shell section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CAPABILITIES</p>
            <h2>能力不是清单，是使用场景</h2>
          </div>
          <Link className="text-link" href="/stack">完整技术栈 →</Link>
        </div>
        <div className="capability-grid">
          {skillGroups.slice(0, 4).map((group) => (
            <article key={group.title}>
              <span className="capability-no">{group.no}</span>
              <h3>{group.title}</h3>
              <p>{group.description}</p>
              <div>{group.skills.slice(0, 5).join(" · ")}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell contact-band">
        <div>
          <p className="eyebrow">LET&apos;S CONNECT</p>
          <h2>欢迎交流工程实践与项目合作。</h2>
          <p>如果你对嵌入式测试、工具开发或这份技术档案感兴趣，可以从这里开始。</p>
        </div>
        <a className="button inverted" href="mailto:hello@example.com">hello@example.com ↗</a>
      </section>
    </>
  );
}
