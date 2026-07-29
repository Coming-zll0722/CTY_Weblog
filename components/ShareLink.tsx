"use client";

import { useState } from "react";

export function ShareLink({ title, url }: { title: string; url: string }) {
  const [status, setStatus] = useState("");

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        setStatus("已打开分享菜单");
      } else {
        await navigator.clipboard.writeText(url);
        setStatus("链接已复制");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setStatus("无法分享，请复制浏览器地址");
      }
    }
  };

  return (
    <span className="share-link">
      <button type="button" onClick={share}>分享文章</button>
      <span aria-live="polite">{status}</span>
    </span>
  );
}
