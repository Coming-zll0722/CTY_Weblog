import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles } from "@/data/site";

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = articles.find((item) => item.slug === slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.summary,
    alternates: { canonical: `/articles/${article.slug}` },
    openGraph: { type: "article", title: article.title, description: article.summary, publishedTime: article.date, modifiedTime: article.updated },
  };
}

export default async function ArticleDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles.find((item) => item.slug === slug);
  if (!article) notFound();
  const index = articles.findIndex((item) => item.slug === slug);
  const previous = articles[index - 1];
  const next = articles[index + 1];

  return (
    <div className="section-shell article-page">
      <div className="reading-progress" />
      <header className="article-hero">
        <Link href="/articles" className="back-link">← 返回文章</Link>
        <span className="article-category">{article.category}</span>
        <h1>{article.title}</h1>
        <p>{article.summary}</p>
        <div className="article-info">
          <span>发布于 {article.date}</span>
          <span>更新于 {article.updated}</span>
          <span>{article.readingTime} 分钟阅读</span>
        </div>
      </header>
      <div className="article-layout">
        <article className="prose">
          <h2 id="background">问题背景</h2>
          <p>网络通信工具看起来只是“连接、发送、接收”，但当它进入稳定的测试流程后，问题会迅速扩展：并发会话如何隔离，消息边界如何识别，异常如何重现，测试结果又如何被复核。</p>
          <blockquote>本文中的协议、字段和数据均为重新设计的示例，不对应任何真实产品或内部系统。</blockquote>
          <h2 id="goal">目标与边界</h2>
          <p>这类工具的价值不是替代所有专业测试设备，而是让高频、可重复、规则明确的工作获得一致的执行入口。首要目标包括可配置、可观测、可追踪和可扩展。</p>
          <ul>
            <li>支持 TCP 客户端、TCP 服务端与 UDP 三类工作模式；</li>
            <li>以十六进制、文本和模板三种方式构造数据；</li>
            <li>将原始日志、字段解析与断言结果关联到同一次执行；</li>
            <li>异常不能只记录“失败”，还要保留足够的定位上下文。</li>
          </ul>
          <h2 id="architecture">方案分析</h2>
          <p>我把系统拆为会话层、编解码层、测试执行层和结果层。协议差异应停留在适配器内部，测试用例只依赖统一能力。</p>
          <div className="diagram" role="img" aria-label="系统处理流程">
            <div>测试用例</div><span>→</span><div>执行引擎</div><span>→</span><div>协议适配器</div><span>→</span><div>设备 / 服务</div>
          </div>
          <pre><code>{`class ProtocolAdapter(Protocol):
    async def connect(self, config: ConnectionConfig) -> None: ...
    async def send(self, payload: bytes) -> SendResult: ...
    async def receive(self, timeout: float) -> bytes: ...
    async def close(self) -> None: ...`}</code></pre>
          <h2 id="validation">测试验证</h2>
          <p>验证分为单元、集成和故障注入三层。单元测试覆盖帧编解码和断言；集成测试使用本地模拟服务；故障注入覆盖超时、断连、粘包、半包和错误校验。</p>
          <table>
            <thead><tr><th>场景</th><th>输入</th><th>预期</th></tr></thead>
            <tbody>
              <tr><td>正常响应</td><td>合法请求帧</td><td>解析字段与断言全部通过</td></tr>
              <tr><td>响应超时</td><td>服务端延迟</td><td>记录超时类型和会话上下文</td></tr>
              <tr><td>校验错误</td><td>修改 CRC 字段</td><td>识别校验失败并保留原始帧</td></tr>
            </tbody>
          </table>
          <h2 id="result">结果与复盘</h2>
          <p>真正可复用的不是某个界面或某段 Socket 代码，而是协议能力的边界、测试执行模型和结果数据结构。把这三部分稳定下来，新协议的接入成本才会持续下降。</p>
          <h2 id="next">后续优化</h2>
          <p>下一步将补充大规模日志下的索引策略、基于数据模板的属性测试，以及测试需求—用例—结果之间的双向追踪。</p>
        </article>
        <aside className="toc">
          <b>本文目录</b>
          <a href="#background">问题背景</a>
          <a href="#goal">目标与边界</a>
          <a href="#architecture">方案分析</a>
          <a href="#validation">测试验证</a>
          <a href="#result">结果与复盘</a>
          <a href="#next">后续优化</a>
        </aside>
      </div>
      <nav className="article-pagination">
        {previous ? <Link href={`/articles/${previous.slug}`}><span>上一篇</span>{previous.title}</Link> : <span />}
        {next ? <Link href={`/articles/${next.slug}`}><span>下一篇</span>{next.title}</Link> : <span />}
      </nav>
    </div>
  );
}
