import { act } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "vitest-browser-react";

import { useIsMobile } from "./useIsMobile";

describe("useIsMobile Hook", () => {
  let listeners: Map<string, ((e: MediaQueryListEvent) => void)[]>;
  let mediaQueryMatches: boolean;
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    listeners = new Map();
    mediaQueryMatches = false;
    originalMatchMedia = window.matchMedia;

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: mediaQueryMatches,
      media: query,
      onchange: null,
      addEventListener: vi.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
        const key = `${query}:${event}`;
        if (!listeners.has(key)) listeners.set(key, []);
        listeners.get(key)!.push(handler);
      }),
      removeEventListener: vi.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
        const key = `${query}:${event}`;
        const handlers = listeners.get(key);
        if (handlers) {
          listeners.set(
            key,
            handlers.filter((h) => h !== handler)
          );
        }
      }),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.clearAllMocks();
  });

  const fireMediaChange = (matches: boolean) => {
    for (const [key, handlers] of listeners) {
      if (key.endsWith(":change")) {
        for (const handler of handlers) {
          handler({ matches } as MediaQueryListEvent);
        }
      }
    }
  };

  describe("基本機能", () => {
    it("初期状態でデスクトップの場合falseを返す", async () => {
      mediaQueryMatches = false;
      const { result } = await renderHook(() => useIsMobile());
      expect(result.current).toBe(false);
    });

    it("初期状態でモバイルの場合trueを返す", async () => {
      mediaQueryMatches = true;
      const { result } = await renderHook(() => useIsMobile());
      expect(result.current).toBe(true);
    });

    it("適切なmax-widthクエリを使用する", async () => {
      await renderHook(() => useIsMobile());
      expect(window.matchMedia).toHaveBeenCalledWith(expect.stringContaining("max-width"));
    });
  });

  describe("リアクティブな変更", () => {
    it("メディアクエリの変更に応じて値が更新される", async () => {
      mediaQueryMatches = false;
      const { result } = await renderHook(() => useIsMobile());

      expect(result.current).toBe(false);

      await act(() => {
        fireMediaChange(true);
      });

      expect(result.current).toBe(true);
    });

    it("複数回の変更に対応する", async () => {
      mediaQueryMatches = false;
      const { result } = await renderHook(() => useIsMobile());

      expect(result.current).toBe(false);

      await act(() => fireMediaChange(true));
      expect(result.current).toBe(true);

      await act(() => fireMediaChange(false));
      expect(result.current).toBe(false);
    });
  });

  describe("クリーンアップ", () => {
    it("アンマウント時にイベントリスナーを解除する", async () => {
      const { unmount } = await renderHook(() => useIsMobile());

      // Listeners are registered
      const changeListeners = [...listeners.entries()].filter(([k]) => k.endsWith(":change"));
      expect(changeListeners.length).toBeGreaterThan(0);

      await unmount();

      // After unmount, the change handler for our query should be removed
      for (const [key, handlers] of listeners) {
        if (key.endsWith(":change")) {
          expect(handlers.length).toBe(0);
        }
      }
    });
  });

  describe("TypeScript型安全性", () => {
    it("正しいboolean型を返す", async () => {
      const { result } = await renderHook(() => useIsMobile());
      expect(typeof result.current).toBe("boolean");
    });
  });
});
