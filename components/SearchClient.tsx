"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { publicApiBase } from "@/lib/api";
import type { TaxonomyItem } from "@/lib/api";

type SearchResult = {
  type: "post" | "project";
  title: string;
  summary: string;
  slug: string;
};

export function SearchClient({ categories = [] }: { categories?: TaxonomyItem[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const normalized = query.trim();
    if (!normalized) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const response = await fetch(
          `${publicApiBase}/search?q=${encodeURIComponent(normalized)}&page=${page}&page_size=10${category ? `&category=${encodeURIComponent(category)}` : ""}`,
          { signal: controller.signal, headers: { Accept: "application/json" } },
        );
        if (!response.ok) throw new Error("search failed");
        const body = await response.json() as {
          data?: { items: SearchResult[]; suggestions?: string[]; total?: number };
        };
        if (!body.data) throw new Error("invalid search response");
        setResults(body.data.items);
        setSuggestions(body.data.suggestions ?? []);
        setTotal(body.data.total ?? 0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [category, page, query]);

  return (
    <div className="section-shell page-shell search-page">
      <header className="page-heading">
        <p className="eyebrow">SEARCH / 搜索</p>
        <h1>找到一条工程线索。</h1>
      </header>
      <label className="search-box">
        <span>⌕</span>
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setPage(1); }}
          placeholder="搜索文章、项目、技术或标签…"
          autoFocus
        />
        {query && <button onClick={() => setQuery("")}>清除</button>}
      </label>
      {categories.length ? (
        <label className="search-filter">
          <span>分类</span>
          <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
            <option value="">全部分类</option>
            {categories.map((item) => <option value={item.slug} key={item.id}>{item.name}</option>)}
          </select>
        </label>
      ) : null}
      {!query ? (
        <div className="search-empty">
          <p>可以试试</p>
          <div className="tag-row">
            {["TCP", "自动化测试", "Python", "FPGA", "架构"].map((item) => (
              <button onClick={() => setQuery(item)} key={item}>{item}</button>
            ))}
          </div>
        </div>
      ) : loading ? (
        <div className="search-empty"><p>正在搜索…</p></div>
      ) : failed ? (
        <div className="search-empty">
          <h2>搜索服务暂时不可用</h2>
          <p>请稍后重试，或从文章与项目页面继续浏览。</p>
        </div>
      ) : results.length ? (
        <div className="search-results">
          <p>找到 {total} 条与“{query}”相关的内容</p>
          {results.map((item) => {
            const base = item.type === "post" ? "/articles" : "/projects";
            return (
              <Link href={`${base}/${item.slug}`} key={`${item.type}:${item.slug}`}>
                <span>{item.type === "post" ? "文章" : "项目"}</span>
                <div>
                  <h2><HighlightedText text={item.title} query={query} /></h2>
                  <p><HighlightedText text={item.summary} query={query} /></p>
                </div>
                <b>↗</b>
              </Link>
            );
          })}
          {total > 10 ? (
            <nav className="search-pagination" aria-label="搜索结果分页">
              <button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>上一页</button>
              <span>第 {page} 页</span>
              <button disabled={page * 10 >= total} onClick={() => setPage((value) => value + 1)}>下一页</button>
            </nav>
          ) : null}
        </div>
      ) : (
        <div className="search-empty">
          <h2>暂时没有结果</h2>
          <p>检查关键词，或尝试更宽泛的技术名称、分类和标签。</p>
          <div className="tag-row">
            {suggestions.map((item) => (
              <button onClick={() => setQuery(item)} key={item}>{item}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const normalized = query.trim();
  if (!normalized) return text;
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, index) =>
    part.localeCompare(normalized, undefined, { sensitivity: "accent" }) === 0
      ? <mark key={`${part}:${index}`}>{part}</mark>
      : part,
  );
}
