export type LayoutMode = "auto" | "desktop";

export function LayoutChoice({ mode, onChange }: { mode: LayoutMode; onChange: (mode: LayoutMode) => void }) {
  return (
    <div className="layout-choice" role="group" aria-label="页面布局">
      <span>页面布局</span>
      <div>
        <button type="button" aria-pressed={mode === "auto"} onClick={() => onChange("auto")}>自动</button>
        <button type="button" aria-pressed={mode === "desktop"} onClick={() => onChange("desktop")}>桌面</button>
      </div>
      <small>桌面布局在窄屏可左右滑动</small>
    </div>
  );
}
