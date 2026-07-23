export type Article = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  date: string;
  updated: string;
  readingTime: number;
  featured?: boolean;
};

export const articles: Article[] = [
  {
    slug: "tcp-udp-test-platform-design",
    title: "从协议分析到自动化执行：网络测试工具的设计方法",
    summary: "拆解一套 TCP/UDP 测试工具如何组织连接、数据帧、断言、日志与报告。",
    category: "测试工具开发",
    tags: ["Python", "TCP", "UDP", "架构"],
    date: "2026-07-18",
    updated: "2026-07-21",
    readingTime: 12,
    featured: true,
  },
  {
    slug: "serial-frame-validation",
    title: "串口通信测试中的数据帧构造、校验与异常注入",
    summary: "以脱敏模拟协议为例，说明帧构造器、CRC 校验和边界场景设计。",
    category: "嵌入式软件测试",
    tags: ["串口", "CRC", "自动化测试"],
    date: "2026-07-10",
    updated: "2026-07-10",
    readingTime: 9,
  },
  {
    slug: "ldra-data-extraction",
    title: "将静态分析结果变成可追踪的工程数据",
    summary: "从 LDRA Testbed 导出数据到结构化报表的清洗、映射和校验策略。",
    category: "自动化测试",
    tags: ["LDRA", "Python", "数据处理"],
    date: "2026-06-26",
    updated: "2026-07-02",
    readingTime: 10,
  },
  {
    slug: "test-case-design-boundaries",
    title: "接口测试用例设计：不要只覆盖正常路径",
    summary: "围绕状态、边界、时序和故障注入，建立可复用的通信接口测试模型。",
    category: "学习笔记",
    tags: ["测试设计", "边界分析"],
    date: "2026-06-12",
    updated: "2026-06-12",
    readingTime: 7,
  },
  {
    slug: "fpga-timing-first-notes",
    title: "FPGA 学习笔记：从逻辑功能走向时序意识",
    summary: "为什么仿真通过并不等于设计可靠，以及建立时钟与约束意识的第一步。",
    category: "FPGA 和数字电路",
    tags: ["FPGA", "Vivado", "时序"],
    date: "2026-05-30",
    updated: "2026-05-30",
    readingTime: 8,
  },
  {
    slug: "ai-assisted-test-workflow",
    title: "AI 辅助测试的边界：生成不是交付",
    summary: "讨论如何把 AI 放进可审查、可追溯、可验证的测试工程流程。",
    category: "AI 辅助开发",
    tags: ["AI", "测试工程", "工作流"],
    date: "2026-05-16",
    updated: "2026-05-20",
    readingTime: 11,
  },
];

export const projects = [
  {
    slug: "protocol-test-platform",
    title: "嵌入式通信协议自动化测试平台",
    summary: "面向多类通信接口的可配置测试执行平台，统一用例、数据帧、设备适配、断言与报告。",
    status: "持续迭代",
    period: "2025 — 至今",
    stack: ["Python", "FastAPI", "React", "PostgreSQL", "Pytest"],
    role: "需求分析、架构设计、核心开发、测试验证",
    challenge: "不同协议和设备驱动的调用方式差异大，测试结果难以统一追踪。",
    result: "建立协议适配层与统一执行模型，缩短重复测试准备时间并提高结果可追溯性。",
  },
  {
    slug: "network-test-tool",
    title: "TCP / UDP 网络测试工具",
    summary: "支持多连接、定时发送、十六进制数据、报文模板和接收断言的桌面测试工具。",
    status: "已完成",
    period: "2025",
    stack: ["Python", "Qt", "Socket", "SQLite"],
    role: "产品设计、界面设计、全栈实现",
    challenge: "长连接、并发收发和界面状态需要保持一致，且日志量较大。",
    result: "实现会话隔离、异步收发和结构化日志，覆盖常用联调与故障复现场景。",
  },
  {
    slug: "ldra-report-extractor",
    title: "LDRA 静态分析数据提取工具",
    summary: "将分散的静态分析结果整理为可筛选、可复核、可归档的结构化质量数据。",
    status: "内部使用",
    period: "2024",
    stack: ["Python", "Pandas", "OpenPyXL", "CLI"],
    role: "流程梳理、数据建模、工具开发",
    challenge: "输入格式不稳定、字段语义分散，人工汇总容易遗漏或错配。",
    result: "把重复整理过程自动化，并通过校验规则降低人工复核成本。",
  },
  {
    slug: "case-document-generator",
    title: "Excel → Word 测试用例生成工具",
    summary: "从结构化用例数据生成版式一致的评审与归档文档。",
    status: "已完成",
    period: "2024",
    stack: ["Python", "OpenPyXL", "python-docx"],
    role: "数据规范、模板设计、开发与维护",
    challenge: "表格数据与 Word 复杂版式之间存在一对多映射。",
    result: "实现模板化生成、字段校验和批量输出，减少格式调整工作。",
  },
  {
    slug: "frame-builder",
    title: "通信数据帧构造与校验工具",
    summary: "以字段模型构造二进制数据帧，支持多字节序、校验算法和异常注入。",
    status: "持续迭代",
    period: "2025 — 至今",
    stack: ["TypeScript", "React", "Vitest"],
    role: "协议抽象、交互设计、前端实现",
    challenge: "字段依赖、位级编辑和动态校验需要清晰且可解释。",
    result: "把不可读的十六进制数据转化为字段级编辑与可视化校验过程。",
  },
  {
    slug: "engineering-notes",
    title: "个人技术博客系统",
    summary: "面向长期积累的技术内容、项目档案与个人品牌基础设施。",
    status: "持续建设",
    period: "2026 — 至今",
    stack: ["React", "TypeScript", "FastAPI", "PostgreSQL"],
    role: "产品、设计、架构与实现",
    challenge: "需要平衡写作体验、结构化内容、SEO、性能与长期维护成本。",
    result: "形成内容、项目、履历与技术能力互相连接的个人技术档案。",
  },
];

export const skillGroups = [
  {
    no: "01",
    title: "编程与工具开发",
    description: "用脚本、桌面工具和 Web 应用，把重复流程转化为稳定工具。",
    skills: ["Python · 熟练", "C / C++ · 工作使用", "TypeScript · 项目使用", "SQL · 项目使用"],
  },
  {
    no: "02",
    title: "嵌入式通信",
    description: "围绕连接、帧格式、时序、异常和可追溯性设计测试。",
    skills: ["TCP / UDP", "串口", "CAN", "RS422 / RS485", "1553B", "ARINC 429"],
  },
  {
    no: "03",
    title: "测试工程",
    description: "从需求和风险出发设计测试，而不止执行既有步骤。",
    skills: ["接口测试", "自动化测试", "静态分析", "用例设计", "数据构造"],
  },
  {
    no: "04",
    title: "系统与部署",
    description: "理解应用从代码到可运行服务的完整路径。",
    skills: ["Linux", "Docker", "Nginx", "Cloudflare", "Git"],
  },
  {
    no: "05",
    title: "Web 工程",
    description: "构建可维护的前后端应用与清晰的数据边界。",
    skills: ["React", "FastAPI", "PostgreSQL", "REST API", "Redis"],
  },
  {
    no: "06",
    title: "硬件基础",
    description: "持续补全从软件接口向数字系统底层延伸的理解。",
    skills: ["FPGA", "数字电路", "Verilog", "Vivado", "时序分析"],
  },
];

export const timeline = [
  ["2026 · 现在", "系统化沉淀", "建立个人技术档案，研究 AI 辅助测试与 FPGA，重构协议测试平台。"],
  ["2025", "工具平台化", "将零散测试脚本组织为可配置、可追溯的通信测试工具。"],
  ["2024", "测试工程实践", "参与嵌入式通信接口测试，开展静态分析、用例设计与数据工具开发。"],
  ["2023", "软件工程起点", "电子信息工程专业毕业，从软硬件交叉背景进入软件测试与开发。"],
];
