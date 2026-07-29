"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { publicApiBase } from "@/lib/api";

export function AnalyticsTracker() {
  const path = usePathname();
  useEffect(() => {
    if (!path || path.startsWith("/admin")) return;
    const controller = new AbortController();
    fetch(`${publicApiBase}/analytics/views`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
      keepalive: true,
      signal: controller.signal,
    }).catch(() => undefined);
    return () => controller.abort();
  }, [path]);
  return null;
}
