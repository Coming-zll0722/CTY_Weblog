import type { IconName } from "@/components/ui/Icon";

export const homeProfile = {
  brand: "从头越",
  domain: "DEVLELIN.XYZ",
  slogan: "雄关漫道真如铁，而今迈步从头越",
  englishSlogan: "A Tech Journey for a Better Me",
  name: "从头越",
  location: "天津",
  birthYear: "2002",
  startedYear: "2024",
  description:
    "一名从事嵌入式软件相关工作的工程师，持续学习 FPGA、集成电路与软件系统设计。记录技术，记录思考，记录成长的过程。",
  heroImage: "/home/mountain-journey.webp",
  githubContributions: null as number | null,
};

// Decorative AI-generated covers used only when the API has no article cover.
export const articleFallbackCovers = [
  "/home/flight.webp",
  "/home/chip.webp",
  "/home/notebook.webp",
];

export const navigation: {
  label: string;
  href: string;
  icon: IconName;
  top?: boolean;
  side?: boolean;
}[] = [
  { label: "首页", href: "/", icon: "home", top: true, side: true },
  { label: "文章", href: "/articles", icon: "article", top: true, side: true },
  { label: "项目", href: "/projects", icon: "project", top: true, side: true },
  { label: "笔记", href: "/notes", icon: "note", top: true, side: true },
  { label: "技术栈", href: "/stack", icon: "chip", top: true },
  {
    label: "资源",
    href: "/resources",
    icon: "resource",
    top: true,
    side: true,
  },
  { label: "时间轴", href: "/timeline", icon: "timeline", side: true },
  { label: "关于我", href: "/about", icon: "user", top: true, side: true },
];

// Planning examples, not recorded activity. Their source is labeled in the UI.
export const learningPlan = {
  sourceLabel: "计划示例",
  completed: 28,
  target: 40,
  items: [
    { name: "考研复习", icon: "graduate", done: 3, target: 5, tone: "teal" },
    { name: "FPGA 学习", icon: "chip", done: 2, target: 3, tone: "blue" },
    { name: "项目开发", icon: "code", done: 1, target: 2, tone: "purple" },
    { name: "技术写作", icon: "note", done: 1, target: 2, tone: "pink" },
    { name: "锻炼运动", icon: "check", done: 1, target: 1, tone: "green" },
  ] satisfies {
    name: string;
    icon: IconName;
    done: number;
    target: number;
    tone: string;
  }[],
};

export const techStack = [
  {
    title: "编程语言",
    items: [
      { name: "Python", mark: "Py", tone: "python" },
      { name: "C/C++", mark: "C⁺", tone: "blue" },
      { name: "TypeScript", mark: "TS", tone: "typescript" },
      { name: "Verilog", mark: "V", tone: "red" },
    ],
  },
  {
    title: "开发方向",
    items: [
      { name: "嵌入式", mark: "chip", tone: "green" },
      { name: "FPGA", mark: "chip", tone: "teal" },
      { name: "集成电路", mark: "chip", tone: "ink" },
      { name: "测试开发", mark: "code", tone: "blue" },
    ],
  },
  {
    title: "工具与框架",
    items: [
      { name: "Qt", mark: "Qt", tone: "green" },
      { name: "FastAPI", mark: "ϟ", tone: "teal" },
      { name: "React", mark: "⚛", tone: "cyan" },
      { name: "PostgreSQL", mark: "Pg", tone: "postgres" },
    ],
  },
];

export const goals: {
  title: string;
  description: string;
  icon: IconName;
  tone: string;
}[] = [
  {
    title: "考上理想的研究生",
    description: "电子信息 / 集成电路",
    icon: "graduate",
    tone: "purple",
  },
  {
    title: "提升 FPGA 与硬件能力",
    description: "从测试到设计，掌握核心技能",
    icon: "chip",
    tone: "purple",
  },
  {
    title: "完善个人技术体系",
    description: "持续输出高质量技术内容",
    icon: "resource",
    tone: "blue",
  },
  {
    title: "保持健康的生活状态",
    description: "锻炼身体，保持良好心态",
    icon: "heart",
    tone: "pink",
  },
];

export const learningOverview = {
  labels: ["学习", "工作", "项目", "运动", "其他"],
  periods: [
    { name: "本周", hours: [28, 40, 12, 7, 6] },
    { name: "本月", hours: [112, 160, 48, 28, 24] },
    { name: "本年", hours: [1344, 1920, 576, 336, 288] },
  ],
};
