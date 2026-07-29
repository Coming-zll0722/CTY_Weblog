import { readFileSync } from "node:fs";
import path from "node:path";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AdminApp } from "@/components/AdminApp";
import { CopyableCode } from "@/components/CopyableCode";
import { SearchClient } from "@/components/SearchClient";
import { SiteFrame } from "@/components/SiteFrame";
import { defaultPublicSettings } from "@/lib/api";

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
});

describe("search", () => {
  test("renders empty state, calls the API, and highlights matching results", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      success: true,
      data: {
        items: [{
          type: "post",
          title: "Python 自动化测试",
          summary: "可复用的 Python 测试工具",
          slug: "python-testing",
        }],
        suggestions: [],
      },
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(<SearchClient />);
    expect(screen.getByText("可以试试")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("搜索文章、项目、技术或标签…"), {
      target: { value: "Python" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(251);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/search?q=Python"),
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
    expect(screen.getAllByText("Python", { selector: "mark" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Python 自动化测试/ })).toHaveAttribute(
      "href",
      "/articles/python-testing",
    );
  });

  test("shows a recoverable service error", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      Response.json({ error: { message: "unavailable" } }, { status: 503 }),
    ));
    render(<SearchClient />);
    fireEvent.change(screen.getByPlaceholderText("搜索文章、项目、技术或标签…"), {
      target: { value: "CAN" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(251);
    });
    expect(screen.getByRole("heading", { name: "搜索服务暂时不可用" })).toBeInTheDocument();
    expect(screen.getByText(/请稍后重试/)).toBeInTheDocument();
  });
});

test("theme and mobile navigation controls update accessible state", async () => {
  vi.useFakeTimers();
  render(<SiteFrame settings={defaultPublicSettings} publicLinks={[]}><p>content</p></SiteFrame>);
  await act(async () => {
    await vi.runOnlyPendingTimersAsync();
  });

  fireEvent.click(screen.getByRole("button", { name: "切换深浅色模式" }));
  expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  expect(localStorage.getItem("theme")).toBe("dark");

  const menu = screen.getByRole("button", { name: "打开导航菜单" });
  expect(menu).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(menu);
  expect(menu).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("navigation", { name: "主导航" })).toHaveClass("open");
});

test("code blocks copy their exact source", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", {
    ...navigator,
    clipboard: { writeText },
  });
  render(<CopyableCode text={"print('ok')\n"}><code>print(&apos;ok&apos;)</code></CopyableCode>);
  fireEvent.click(screen.getByRole("button", { name: "复制代码" }));
  expect(writeText).toHaveBeenCalledWith("print('ok')\n");
  expect(await screen.findByText("已复制")).toBeInTheDocument();
});

test("admin login validates and submits credentials without local token storage", async () => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    void _init;
    const url = String(input);
    if (url.endsWith("/auth/me")) {
      return Response.json({ error: { message: "未登录" } }, { status: 401 });
    }
    return Response.json({
      success: true,
      data: {
        user: {
          id: "11111111-1111-4111-8111-111111111111",
          email: "admin@example.com",
          display_name: "管理员",
          role: "admin",
        },
        csrf_token: "test-csrf",
      },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<AdminApp />);

  expect(await screen.findByRole("heading", { name: "登录内容工作台" })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "管理员邮箱" }), {
    target: { value: "admin@example.com" },
  });
  fireEvent.change(screen.getByLabelText("密码"), {
    target: { value: "a-secure-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "登录" }));

  expect(await screen.findByText("已登录为 admin@example.com")).toBeInTheDocument();
  const loginCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/auth/login"));
  expect(loginCall?.[1]).toEqual(expect.objectContaining({
    method: "POST",
    credentials: "include",
  }));
  expect(localStorage.length).toBe(0);
});

test("authenticated admin can edit taxonomy through the real management form", async () => {
  document.cookie = "engineering_notes_csrf=test-csrf";
  const category = {
    id: "33333333-3333-4333-8333-333333333333",
    name: "嵌入式测试",
    slug: "embedded-testing",
    description: "原说明",
  };
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/auth/me")) {
      return Response.json({
        success: true,
        data: {
          id: "11111111-1111-4111-8111-111111111111",
          email: "admin@example.com",
          display_name: "管理员",
          role: "admin",
        },
      });
    }
    if (url.endsWith("/categories")) {
      return Response.json({ success: true, data: [category] });
    }
    if (url.endsWith("/tags")) {
      return Response.json({ success: true, data: [] });
    }
    if (url.endsWith(`/admin/categories/${category.id}`) && init?.method === "PATCH") {
      return Response.json({
        success: true,
        data: { ...category, name: "嵌入式软件测试" },
      });
    }
    return Response.json({ success: true, data: [] });
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<AdminApp />);

  fireEvent.click(await screen.findByRole("button", { name: "分类与标签" }));
  const section = (await screen.findByRole("heading", { name: "分类" })).closest("section");
  expect(section).not.toBeNull();
  fireEvent.click(within(section!).getByRole("button", { name: "编辑" }));
  fireEvent.change(within(section!).getByRole("textbox", { name: "名称" }), {
    target: { value: "嵌入式软件测试" },
  });
  fireEvent.click(within(section!).getByRole("button", { name: "保存分类" }));

  await waitFor(() => {
    const call = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith(`/admin/categories/${category.id}`)
        && init?.method === "PATCH",
    );
    expect(call).toBeDefined();
    const headers = call?.[1]?.headers as Headers;
    expect(headers.get("X-CSRF-Token")).toBe("test-csrf");
    expect(JSON.parse(String(call?.[1]?.body)).name).toBe("嵌入式软件测试");
  });
});

test("authenticated admin can update typed public site settings", async () => {
  document.cookie = "engineering_notes_csrf=test-csrf";
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/auth/me")) {
      return Response.json({
        success: true,
        data: {
          id: "11111111-1111-4111-8111-111111111111",
          email: "admin@example.com",
          display_name: "管理员",
          role: "admin",
        },
      });
    }
    if (url.endsWith("/admin/analytics/overview")) {
      return Response.json({ success: true, data: { views: 12, visitors: 5 } });
    }
    if (url.endsWith("/admin/settings") && init?.method === "PATCH") {
      return Response.json({ success: true, data: JSON.parse(String(init.body)) });
    }
    if (url.endsWith("/admin/settings")) {
      return Response.json({
        success: true,
        data: {
          "public.site_name": "旧站点名称",
          "public.github_url": "https://github.com/old",
        },
      });
    }
    return Response.json({ success: true, data: [] });
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<AdminApp />);

  fireEvent.click(await screen.findByRole("button", { name: "设置与运维" }));
  const siteName = await screen.findByRole("textbox", { name: "站点名称" });
  expect(siteName).toHaveValue("旧站点名称");
  fireEvent.change(siteName, { target: { value: "新的工程笔记" } });
  fireEvent.click(screen.getByRole("button", { name: "保存设置" }));

  await waitFor(() => {
    const call = fetchMock.mock.calls.find(
      ([url, init]) => String(url).endsWith("/admin/settings") && init?.method === "PATCH",
    );
    expect(call).toBeDefined();
    const headers = call?.[1]?.headers as Headers;
    expect(headers.get("X-CSRF-Token")).toBe("test-csrf");
    expect(JSON.parse(String(call?.[1]?.body)).values["public.site_name"]).toBe("新的工程笔记");
  });
});

test("responsive stylesheet includes compact navigation and admin layouts", () => {
  const css = readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");
  expect(css).toMatch(/@media\s*\(max-width:\s*720px\)/);
  expect(css).toMatch(/\.main-nav\.open\s*\{\s*display:\s*flex/);
  expect(css).toMatch(/\.admin-workspace\s*\{\s*grid-template-columns:\s*1fr/);
  expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
