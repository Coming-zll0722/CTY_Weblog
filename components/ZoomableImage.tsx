"use client";

import { useEffect, useRef, useState } from "react";

export function ZoomableImage({
  src,
  alt,
  title,
}: {
  src: string;
  alt: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", close);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        className="zoomable-image"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={alt ? `放大图片：${alt}` : "放大图片"}
      >
        {/* External Markdown images cannot use next/image without an allowlist. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} title={title} loading="lazy" />
      </button>
      {open ? (
        <div
          className="image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={alt || "放大图片"}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <button ref={closeRef} aria-label="关闭图片" onClick={() => setOpen(false)}>×</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} />
        </div>
      ) : null}
    </>
  );
}
