import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import {
  CurrentStatus,
  HeroCard,
  RecentArticles,
} from "@/components/home/CoreCards";
import { FeaturedProject } from "@/components/home/FeaturedProject";
import { LearningOverview } from "@/components/home/LearningOverview";
import type { PostListItem } from "@/lib/api";

test("hero keeps API totals and never substitutes mock GitHub counts", () => {
  render(<HeroCard articles={17} projects={2} />);
  expect(screen.getByText("17")).toBeInTheDocument();
  expect(screen.getByText("2")).toBeInTheDocument();
  expect(screen.getByText("GitHub 提交 · 待接入")).toBeInTheDocument();
  expect(screen.queryByText("500+")).not.toBeInTheDocument();
});

test("article covers prefer API media and empty content stays empty", () => {
  const post: PostListItem = {
    id: "post",
    title: "真实文章",
    slug: "real-post",
    summary: "来自真实内容数据的摘要。",
    category: "工程",
    category_slug: "engineering",
    tags: [],
    tag_slugs: [],
    reading_time: 4,
    series: null,
    published_at: "2026-09-21T00:00:00Z",
    updated_at: "2026-09-21T00:00:00Z",
    cover: {
      id: "cover",
      storage_key: "real-cover.png",
      alt_text: null,
      width: 800,
      height: 600,
    },
  };
  const { container, rerender } = render(<RecentArticles articles={[post]} />);
  expect(container.querySelector("img")).toHaveAttribute(
    "src",
    "/api/v1/media/real-cover.png?width=480&format=webp",
  );
  expect(screen.getByRole("link", { name: "真实文章" })).toHaveAttribute(
    "href",
    "/articles/real-post",
  );
  rerender(<RecentArticles articles={[]} />);
  expect(screen.getByText(/文章正在整理/)).toBeInTheDocument();
  expect(screen.queryByText("真实文章")).not.toBeInTheDocument();
});

test("learning progress is calculated and all periods are labeled as examples", () => {
  render(
    <>
      <CurrentStatus />
      <LearningOverview />
    </>,
  );
  expect(
    screen.getByRole("img", { name: "本周学习计划示例：70%" }),
  ).toBeInTheDocument();
  expect(screen.getAllByText("计划示例")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "本月" }));
  expect(screen.getByRole("button", { name: "本月" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByText("112h")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "本周" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("featured project uses the actual record and exposes no invented repository", () => {
  const project = {
    title: "真实项目",
    slug: "real-project",
    summary: "实际项目说明",
    status: "持续维护",
    tags: ["C++"],
    cover: null,
    repo_url: null,
    started_at: "2025-01-01",
    ended_at: null,
  };
  const { rerender } = render(<FeaturedProject project={project} />);
  expect(screen.getByRole("link", { name: "查看项目" })).toHaveAttribute(
    "href",
    "/projects/real-project",
  );
  expect(screen.getByText("仓库未公开")).toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "GitHub" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("概念界面 · 非实际截图")).toBeInTheDocument();
  rerender(
    <FeaturedProject
      project={{ ...project, repo_url: "https://github.com/example/project" }}
    />,
  );
  expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/example/project",
  );
  rerender(<FeaturedProject project={null} />);
  expect(
    within(screen.getByRole("region", { name: "精选项目" })).getByText(
      "项目正在整理",
    ),
  ).toBeInTheDocument();
});
