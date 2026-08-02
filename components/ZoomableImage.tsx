"use client";

import { useEffect, useRef, useState } from "react";

export function ZoomableImage({
  src,
  alt,
  title,
  width,
  height,
  sizes = "(max-width: 768px) 100vw, 760px",
}: {
  src: string;
  alt: string;
  title?: string;
  width?: number | null;
  height?: number | null;
  sizes?: string;
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
      if (event.key === "Tab") {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", close);
      trigger?.focus();
    };
  }, [open]);

  const responsive = src.startsWith("/api/v1/media/");
  const candidateWidths = [480, 960, 1440].filter((candidate) => !width || candidate < width);
  const sourceSet = (format: "avif" | "webp") => candidateWidths
    .map((candidate) => `${src}?width=${candidate}&format=${format} ${candidate}w`)
    .join(", ");

  return (
    <>
      <button
        ref={triggerRef}
        className="zoomable-image"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={alt ? `放大图片：${alt}` : "放大图片"}
      >
        <picture>
          {responsive && candidateWidths.length ? (
            <source type="image/avif" srcSet={sourceSet("avif")} sizes={sizes} />
          ) : null}
          {responsive && candidateWidths.length ? (
            <source type="image/webp" srcSet={sourceSet("webp")} sizes={sizes} />
          ) : null}
          <img
            src={src}
            alt={alt}
            title={title}
            width={width ?? undefined}
            height={height ?? undefined}
            sizes={sizes}
            loading="lazy"
            decoding="async"
          />
        </picture>
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
          <img src={src} alt={alt} decoding="async" />
        </div>
      ) : null}
    </>
  );
}
