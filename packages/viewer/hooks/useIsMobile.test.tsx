import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
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
    it("初期状態でデスクトップの場合falseを返す", () => {
      mediaQueryMatches = false;
      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(false);
    });

    it("初期状態でモバイルの場合trueを返す", () => {
      mediaQueryMatches = true;
      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(true);
    });

    it("適切なmax-widthクエリを使用する", () => {
      renderHook(() => useIsMobile());
      expect(window.matchMedia).toHaveBeenCalledWith(expect.stringContaining("max-width"));
    });
  });

  describe("リアクティブな変更", () => {
    it("メディアクエリの変更に応じて値が更新される", () => {
      mediaQueryMatches = false;
      const { result } = renderHook(() => useIsMobile());

      expect(result.current).toBe(false);

      act(() => {
        fireMediaChange(true);
      });

      expect(result.current).toBe(true);
    });

    it("複数回の変更に対応する", () => {
      mediaQueryMatches = false;
      const { result } = renderHook(() => useIsMobile());

      expect(result.current).toBe(false);

      act(() => fireMediaChange(true));
      expect(result.current).toBe(true);

      act(() => fireMediaChange(false));
      expect(result.current).toBe(false);
    });
  });

  describe("クリーンアップ", () => {
    it("アンマウント時にイベントリスナーを解除する", () => {
      const { unmount } = renderHook(() => useIsMobile());

      // Listeners are registered
      const changeListeners = [...listeners.entries()].filter(([k]) => k.endsWith(":change"));
      expect(changeListeners.length).toBeGreaterThan(0);

      unmount();

      // After unmount, the change handler for our query should be removed
      for (const [key, handlers] of listeners) {
        if (key.endsWith(":change")) {
          expect(handlers.length).toBe(0);
        }
      }
    });
  });

  describe("TypeScript型安全性", () => {
    it("正しいboolean型を返す", () => {
      const { result } = renderHook(() => useIsMobile());
      expect(typeof result.current).toBe("boolean");
    });
  });
});
