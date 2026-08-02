export const skillGroups = [
  {
    no: "01",
    title: "测试系统与工具开发",
    description: "把协议、用例、证据与报告拆成稳定边界，让重复验证可以被复用和追踪。",
    scenario: "协议测试平台、数据构造、报告生成、回归执行",
    skills: [
      { name: "Python", level: "熟练使用" },
      { name: "C / C++", level: "工作使用" },
      { name: "SQL", level: "项目经验" },
      { name: "pytest", level: "项目经验" },
    ],
    boundary: "不把一次性脚本直接包装成平台；先稳定执行模型和证据边界。",
    href: "/projects/protocol-test-platform",
  },
  {
    no: "02",
    title: "嵌入式通信验证",
    description: "围绕连接、帧格式、时序、异常与可追溯性设计验证路径。",
    scenario: "TCP / UDP、串口、CAN、RS422 / RS485、1553B、ARINC 429",
    skills: [
      { name: "TCP / UDP", level: "熟练使用" },
      { name: "串口与 CAN", level: "项目经验" },
      { name: "总线协议验证", level: "项目经验" },
    ],
    boundary: "公开内容只使用模拟帧格式，不展示内部协议、设备信息或真实数据。",
    href: "/articles/tcp-message-boundaries",
  },
  {
    no: "03",
    title: "测试分析与证据链",
    description: "从需求和风险出发设计断言，保留失败定位所需的原始证据与上下文。",
    scenario: "接口测试、边界分析、静态分析、可追溯用例、异常注入",
    skills: [
      { name: "用例设计", level: "熟练使用" },
      { name: "自动化测试", level: "熟练使用" },
      { name: "LDRA Testbed", level: "项目经验" },
    ],
    boundary: "通过工具减少重复劳动，但不把生成结果当作未经复核的结论。",
    href: "/articles/test-evidence-traceability",
  },
  {
    no: "04",
    title: "Web 系统与交付",
    description: "维护从内容模型、接口、安全控制到容器发布和回滚的完整链路。",
    scenario: "内容系统、管理后台、数据库迁移、单机容器化部署",
    skills: [
      { name: "React / TypeScript", level: "项目经验" },
      { name: "FastAPI", level: "项目经验" },
      { name: "PostgreSQL", level: "项目经验" },
      { name: "Docker / Nginx", level: "项目经验" },
    ],
    boundary: "当前以单实例为前提；扩容前需迁移限流状态与媒体存储。",
    href: "/projects/cty-log-technical-archive",
  },
  {
    no: "05",
    title: "FPGA 与数字系统基础",
    description: "从组合逻辑、时序逻辑逐步走向约束、仿真、CDC 与时序报告。",
    scenario: "Verilog 学习实验、时钟约束、接口时序、可复现实验记录",
    skills: [
      { name: "Verilog", level: "正在学习" },
      { name: "Vivado", level: "正在学习" },
      { name: "时序分析", level: "正在学习" },
    ],
    boundary: "这是持续补全中的学习方向，不等同于成熟工程项目经验。",
    href: "/projects/fpga-timing-verification-lab",
  },
];
export const currentFocus = [
  {
    no: "A",
    title: "协议测试平台的边界",
    description: "继续整理执行模型、证据存储和报告之间的职责划分。",
  },
  {
    no: "B",
    title: "FPGA 时序验证",
    description: "用小型可复现实验理解约束、跨时钟域与报告检查顺序。",
  },
  {
    no: "C",
    title: "AI 辅助测试的可追溯性",
    description: "把生成限制在候选环节，用规则、引用与人工审核保留判断链。",
  },
];
