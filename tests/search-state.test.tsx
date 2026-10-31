import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { SearchClient } from "@/components/SearchClient";

function result(title: string) {
  return Response.json({ data: {
    items: [{ type: "post", title, summary: title, slug: title }], total: 1,
  } });
}

test("initial query stays pending until an empty response actually arrives", async () => {
  vi.useFakeTimers();
  let finish!: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; })));
  render(<SearchClient initialQuery="TCP" />);
  expect(screen.getByRole("status")).toHaveTextContent("正在搜索");
  expect(screen.queryByText("暂时没有结果")).not.toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(251); });
  expect(screen.getByRole("status")).toBeInTheDocument();
  await act(async () => { finish(Response.json({ data: { items: [], total: 0 } })); });
  expect(screen.getByText("暂时没有结果")).toBeInTheDocument();
});

test("changing a query hides old results immediately and ignores a late aborted response", async () => {
  vi.useFakeTimers();
  let oldFinish!: (response: Response) => void;
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(result("TCP 结果"))
    .mockImplementationOnce(() => new Promise<Response>((resolve) => { oldFinish = resolve; }))
    .mockResolvedValueOnce(result("Python 结果"));
  vi.stubGlobal("fetch", fetchMock);
  render(<SearchClient initialQuery="TCP" />);
  await act(async () => { await vi.advanceTimersByTimeAsync(251); });
  expect(screen.getByRole("link", { name: /TCP 结果/ })).toBeInTheDocument();
  const input = screen.getByRole("textbox", { name: "搜索文章和项目" });
  fireEvent.change(input, { target: { value: "UDP" } });
  expect(screen.queryByRole("link", { name: /TCP 结果/ })).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(251); });
  fireEvent.change(input, { target: { value: "Python" } });
  await act(async () => { await vi.advanceTimersByTimeAsync(251); });
  await act(async () => { oldFinish(result("迟到 UDP 结果")); });
  expect(screen.getByRole("link", { name: /Python 结果/ })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /UDP/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "清除" }));
  expect(screen.getByText("可以试试")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Python 结果/ })).not.toBeInTheDocument();
});

test("category, pagination and history restoration keep results associated with their request", async () => {
  vi.useFakeTimers();
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: {
    items: [{ type: "post", title: "通信记录", summary: "测试", slug: "record" }], total: 12,
  } }));
  vi.stubGlobal("fetch", fetchMock);
  render(<SearchClient initialQuery="TCP" categories={[{ id: "1", name: "通信", slug: "network" }]} />);
  await act(async () => { await vi.advanceTimersByTimeAsync(251); });
  fireEvent.click(screen.getByRole("button", { name: "下一页" }));
  expect(screen.getByRole("status")).toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(251); });
  expect(fetchMock.mock.calls.at(-1)?.[0]).toContain("page=2");
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "network" } });
  expect(screen.getByRole("status")).toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(251); });
  expect(fetchMock.mock.calls.at(-1)?.[0]).toContain("page=1&page_size=10&category=network");
  act(() => {
    window.history.replaceState({}, "", "/search?q=UDP&page=2");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  expect(screen.getByRole("textbox", { name: "搜索文章和项目" })).toHaveValue("UDP");
  expect(screen.getByRole("combobox")).toHaveValue("");
  await act(async () => { await vi.advanceTimersByTimeAsync(251); });
  expect(fetchMock.mock.calls.at(-1)?.[0]).toContain("q=UDP&page=2");
});
