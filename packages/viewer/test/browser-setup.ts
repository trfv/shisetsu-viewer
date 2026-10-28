/* eslint-disable @typescript-eslint/no-explicit-any */

import { afterEach, beforeAll, afterAll, vi } from "vitest";

import { resetCache } from "../api/cache";

let worker: any;

beforeAll(async () => {
  // 遷移中は ::view-transition が画面を覆い、userEvent のクリックが下の要素に届かない。
  const style = document.createElement("style");
  style.textContent =
    "::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }";
  document.head.append(style);

  if (typeof window !== "undefined") {
    try {
      const { worker: mswWorker } = await import("./mocks/browser");
      worker = mswWorker;
      await worker.start({
        onUnhandledFrame: "bypass",
        quiet: true,
      });
    } catch {
      console.log("MSW not available in browser mode, skipping setup");
    }
  }
  if (!globalThis.matchMedia) {
    globalThis.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }

  if (!globalThis.IntersectionObserver) {
    globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      root: null,
      rootMargin: "",
      thresholds: [],
      takeRecords: vi.fn().mockReturnValue([]),
    }));
  }

  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  }

  if (!window.scrollTo) {
    window.scrollTo = vi.fn();
  }

  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning:") || args[0].includes("ReactDOM.render"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (typeof args[0] === "string" && args[0].includes("Warning:")) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterEach(() => {
  resetCache();
  if (worker) {
    worker.resetHandlers();
  }
  vi.clearAllMocks();
  vi.clearAllTimers();
});

afterAll(() => {
  if (worker) {
    worker.stop();
  }
  vi.resetAllMocks();
  vi.restoreAllMocks();
});
