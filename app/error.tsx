"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page rendering failed", error.digest ?? error.name);
  }, [error]);
  return (
    <div className="section-shell page-shell not-found-page">
      <p className="eyebrow">500 / SERVER ERROR</p>
      <h1>内容服务暂时不可用。</h1>
      <p>请求没有完成。你可以重试，或先返回首页继续浏览。</p>
      <div className="hero-actions">
        <button className="button primary" onClick={reset}>重新尝试</button>
        <Link className="button secondary" href="/">返回首页</Link>
      </div>
    </div>
  );
}
