"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { articles, projects } from "@/data/site";

export function SearchClient() {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!normalized) return [];
    const articleResults = articles
      .filter((item) => [item.title, item.summary, item.category, ...item.tags].join(" ").toLowerCase().includes(normalized))
      .map((item) => ({ type: "文章", title: item.title, summary: item.summary, href: `/articles/${item.slug}` }));
    const projectResults = projects
      .filter((item) => [item.title, item.summary, ...item.stack].join(" ").toLowerCase().includes(normalized))
      .map((item) => ({ type: "项目", title: item.title, summary: item.summary, href: `/projects/${item.slug}` }));
    return [...articleResults, ...projectResults];
  }, [normalized]);

  return (
    <div className="section-shell page-shell search-page">
      <header className="page-heading">
        <p className="eyebrow">SEARCH / 搜索</p>
        <h1>找到一条工程线索。</h1>
      </header>
      <label className="search-box">
        <span>⌕</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索文章、项目、技术或标签…" autoFocus />
        {query && <button onClick={() => setQuery("")}>清除</button>}
      </label>
      {!query ? (
        <div className="search-empty">
          <p>可以试试</p>
          <div className="tag-row">{["TCP", "自动化测试", "Python", "FPGA", "架构"].map((item) => <button onClick={() => setQuery(item)} key={item}>{item}</button>)}</div>
        </div>
      ) : results.length ? (
        <div className="search-results">
          <p>找到 {results.length} 条与“{query}”相关的内容</p>
          {results.map((item) => (
            <Link href={item.href} key={item.href}><span>{item.type}</span><div><h2>{item.title}</h2><p>{item.summary}</p></div><b>↗</b></Link>
          ))}
        </div>
      ) : (
        <div className="search-empty"><h2>暂时没有结果</h2><p>检查关键词，或尝试更宽泛的技术名称、分类和标签。</p></div>
      )}
    </div>
  );
}
