import { describe, expect, test, vi } from "vitest";
import { renderHook } from "vitest-browser-react";

import { useInfiniteScroll } from "./useInfiniteScroll";

describe("useInfiniteScroll", () => {
  test("行数が50以上なら末尾から50番目に sentinel を置く", async () => {
    const { result } = await renderHook(() => useInfiniteScroll(vi.fn(), 100));
    expect(result.current.sentinelIndex).toBe(50);
  });

  test("行数がちょうど50なら sentinelIndex は 0", async () => {
    const { result } = await renderHook(() => useInfiniteScroll(vi.fn(), 50));
    expect(result.current.sentinelIndex).toBe(0);
  });

  test("行数が50未満でも sentinelIndex は負値にならず 0 にクランプされる", async () => {
    const { result } = await renderHook(() => useInfiniteScroll(vi.fn(), 5));
    expect(result.current.sentinelIndex).toBe(0);
  });

  test("行数が0でも sentinelIndex は 0", async () => {
    const { result } = await renderHook(() => useInfiniteScroll(vi.fn(), 0));
    expect(result.current.sentinelIndex).toBe(0);
  });

  test("sentinelRef はコールバック ref（関数）", async () => {
    const { result } = await renderHook(() => useInfiniteScroll(vi.fn(), 10));
    expect(typeof result.current.sentinelRef).toBe("function");
  });
});
