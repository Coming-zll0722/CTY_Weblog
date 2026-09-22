import type { CSSProperties } from "react";

const paths = {
  home: "m3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9",
  article:
    "M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 5h8M8 12h8M8 16h5",
  project: "m12 3 9 5-9 5-9-5 9-5Zm-9 5v10l9 4 9-4V8m-9 5v9",
  note: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 0v6h6M8 13h8M8 17h5",
  resource:
    "m10 13 4-4m-6 6-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 14a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-1 1",
  timeline: "M12 3a9 9 0 1 0 9 9M12 6v6l4 2M17 3h4v4",
  user: "M20 21a8 8 0 0 0-16 0M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
  search: "m21 21-5-5M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1",
  moon: "M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11Z",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  external:
    "M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5",
  code: "m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18",
  chip: "M6 6h12v12H6V6Zm3 3h6v6H9V9ZM9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4",
  graduate: "m2 9 10-5 10 5-10 5L2 9Zm4 2v6l6 3 6-3v-6m4-2v8",
  heart: "M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1C-1 10 7 17 12 21c5-4 13-11 8-16Z",
  check: "m5 12 4 4L19 6",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2",
  pin: "M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 0 1 14 0ZM12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "m6 6 12 12M6 18 18 6",
  mail: "M3 5h18v14H3V5Zm0 0 9 8 9-8",
  github:
    "M9 20c-5 2-5-3-7-3m14 5v-4c0-1-.3-2-1-2 4-.5 7-2 7-6a5 5 0 0 0-1-4c.3-1 .3-3 0-4-2 0-4 1-5 2a14 14 0 0 0-6 0C8 3 6 2 4 2c-.3 1-.3 3 0 4a5 5 0 0 0-1 4c0 4 3 5.5 7 6-.7 0-1 1-1 2v4",
  star: "m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1 3-6Z",
  branch:
    "M6 6v12m0-6h7a5 5 0 0 0 5-5V6M6 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm12 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM6 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
} as const;

export type IconName = keyof typeof paths;
export function Icon({
  name,
  size = 20,
  className,
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
