import { afterEach, describe, expect, it, vi } from "vitest";

import { cached } from "./cache";

describe("cached", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("同じ key には同じ Promise を返し、fetcher を 1 回だけ呼ぶ", async () => {
    const fetcher = vi.fn(() => Promise.resolve("A"));

    const first = cached("k", fetcher);
    const second = cached("k", fetcher);

    expect(second).toBe(first);
    expect(fetcher).toHaveBeenCalledOnce();
    await expect(first).resolves.toBe("A");
  });

  it("key が違えば別々に取得する", () => {
    const fetcher = vi.fn(() => Promise.resolve("A"));

    cached("k1", fetcher);
    cached("k2", fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("60 秒を過ぎると取り直す", () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(() => Promise.resolve("A"));

    cached("k", fetcher);
    vi.advanceTimersByTime(59_999);
    cached("k", fetcher);
    expect(fetcher).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(1);
    cached("k", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("reject された Promise も TTL までは同じものを返す", async () => {
    const fetcher = vi.fn(() => Promise.reject(new Error("boom")));

    await expect(cached("k", fetcher)).rejects.toThrow("boom");

    await expect(cached("k", fetcher)).rejects.toThrow("boom");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("誰も待っていない Promise が reject されても unhandledrejection を起こさない", async () => {
    const onUnhandled = vi.fn();
    window.addEventListener("unhandledrejection", onUnhandled);

    cached("k", () => Promise.reject(new Error("boom")));
    await new Promise((resolve) => setTimeout(resolve, 50));

    window.removeEventListener("unhandledrejection", onUnhandled);
    expect(onUnhandled).not.toHaveBeenCalled();
  });
});
