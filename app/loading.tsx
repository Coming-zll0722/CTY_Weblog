export default function Loading() {
  return (
    <div className="section-shell page-shell" role="status" aria-live="polite">
      <div className="loading-line" />
      <div className="loading-line wide" />
      <div className="loading-line" />
      <span className="sr-only">正在加载内容…</span>
    </div>
  );
}
