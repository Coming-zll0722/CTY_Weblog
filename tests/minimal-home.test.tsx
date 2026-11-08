import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import { MinimalHome } from "@/components/home/MinimalHome";
import { defaultPublicSettings, type PostListItem, type ProjectListItem } from "@/lib/api";

test("home keeps real titles, dates and destinations and limits the selection", () => {
  const articles = Array.from({ length: 6 }, (_, i) => ({
    id: String(i), title: `真实长标题 ${i}：协议边界、失败分析和重复验证`, slug: `post-${i}`,
    summary: `真实摘要 ${i}`, category: "网络", category_slug: "network", published_at: "2026-07-29T12:00:00Z",
  } as PostListItem));
  const projects = Array.from({ length: 3 }, (_, i) => ({
    id: String(i), title: `真实项目 ${i}`, slug: `project-${i}`, summary: "实际项目说明", tags: ["Python", "TCP"],
  } as ProjectListItem));
  const { container } = render(<MinimalHome articles={articles} projects={projects} settings={defaultPublicSettings} />);
  const recent = screen.getByRole("region", { name: "近期文章" });
  expect(within(recent).getAllByRole("article")).toHaveLength(4);
  expect(within(recent).getByRole("link", { name: "查看全部" })).toHaveAttribute("href", "/articles");
  expect(within(recent).getByRole("link", { name: articles[0].title })).toHaveAttribute("href", "/articles/post-0");
  expect(within(recent).getAllByText("2026/07/29")).toHaveLength(4);
  const stack = screen.getByRole("region", { name: "技术栈" });
  expect(within(stack).getByRole("link", { name: "能力地图" })).toHaveAttribute("href", "/stack");
  const skills = within(stack).getAllByRole("listitem");
  expect(skills).toHaveLength(3);
  expect(skills[0]).toHaveTextContent(/嵌入式通信与测试.*工作实践.*Python.*C \/ C\+\+.*TCP \/ UDP.*串口 \/ CAN.*用于协议验证、测试自动化与工具开发。/);
  expect(skills[1]).toHaveTextContent(/Web 开发与部署.*项目经验.*React \/ TypeScript.*FastAPI.*PostgreSQL.*Docker.*用于开发个人站点和维护容器部署。/);
  expect(skills[2]).toHaveTextContent(/FPGA 与数字电路.*正在学习.*Verilog.*Vivado.*时序分析.*通过小型实验练习仿真、时序约束与分析。/);
  const selected = screen.getByRole("region", { name: "代表项目" });
  expect(within(selected).getAllByRole("article")).toHaveLength(2);
  expect(within(selected).getByRole("link", { name: "查看全部" })).toHaveAttribute("href", "/projects");
  expect(within(selected).getByRole("link", { name: "真实项目 0" })).toHaveAttribute("href", "/projects/project-0");
  expect(within(selected).getAllByText("Python · TCP")).toHaveLength(2);
  expect(screen.getByRole("link", { name: "阅读文章" })).toHaveAttribute("href", "/articles");
  const about = screen.getByRole("region", { name: "关于我" });
  expect(within(about).getByRole("link", { name: "更多关于我" })).toHaveAttribute("href", "/about");
  expect(about.closest(".minimal-intro")).toContainElement(screen.getByRole("heading", { name: "从头越" }));
  const focus = screen.getByRole("region", { name: "最近在做" });
  const updates = within(focus).getAllByRole("listitem");
  expect(updates).toHaveLength(3);
  expect(updates[0]).toHaveTextContent("继续整理执行模型、证据存储和报告之间的职责划分。");
  expect(updates[1]).toHaveTextContent("用小型可复现实验理解约束、跨时钟域与报告检查顺序。");
  expect(updates[2]).toHaveTextContent("把生成限制在候选环节，用规则、引用与人工审核保留判断链。");
  expect(container.querySelector("img")).toBeNull();
  expect(screen.queryByText(/计划示例|未接入|Passed/)).not.toBeInTheDocument();
});

test("empty content never becomes demonstration articles or projects", () => {
  render(<MinimalHome articles={[]} projects={[]} settings={defaultPublicSettings} />);
  expect(screen.getByText(/文章正在整理/)).toBeInTheDocument();
  expect(screen.getByText(/项目正在整理/)).toBeInTheDocument();
  expect(screen.queryAllByRole("article")).toHaveLength(0);
  expect(screen.getByRole("region", { name: "最近在做" }).querySelectorAll("li")).toHaveLength(3);
});
