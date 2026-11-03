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
  expect(within(recent).getByRole("link", { name: articles[0].title })).toHaveAttribute("href", "/articles/post-0");
  expect(within(recent).getAllByText("2026/07/29")).toHaveLength(4);
  const selected = screen.getByRole("region", { name: "代表项目" });
  expect(within(selected).getAllByRole("article")).toHaveLength(2);
  expect(within(selected).getByRole("link", { name: "真实项目 0" })).toHaveAttribute("href", "/projects/project-0");
  expect(within(selected).getAllByText("Python · TCP")).toHaveLength(2);
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
