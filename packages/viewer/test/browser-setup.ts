/* eslint-disable @typescript-eslint/no-explicit-any */

import { afterEach, beforeAll, afterAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

let worker: any;

beforeAll(async () => {
  if (typeof window !== "undefined") {
    try {
      const { worker: mswWorker } = await import("./mocks/browser");
      worker = mswWorker;
      await worker.start({
        onUnhandledRequest: "bypass",
        quiet: true, // Suppress MSW logs
      });
    } catch {
      console.log("MSW not available in browser mode, skipping setup");
    }
  }
  // Mock matchMedia (not needed in real browser but kept for consistency)
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

  // Mock IntersectionObserver if not available
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

  // Mock ResizeObserver if not available
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  }

  // Mock scrollTo if not available
  if (!window.scrollTo) {
    window.scrollTo = vi.fn();
  }

  // Mock console methods for cleaner test output
  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args: any[]) => {
    // Filter out expected React warnings
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning:") || args[0].includes("ReactDOM.render"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    // Filter out expected warnings
    if (typeof args[0] === "string" && args[0].includes("Warning:")) {
      return;
    }
    originalWarn.call(console, ...args);
  };

  // Handle unhandled rejections from Apollo Client cleanup
  window.addEventListener("unhandledrejection", (event) => {
    // Filter out Apollo Client MockedProvider cleanup errors
    if (
      event.reason?.message?.includes("QueryManager stopped while query was in flight") ||
      event.reason?.message?.includes("Invariant Violation")
    ) {
      event.preventDefault();
      return;
    }
  });
});

// Clean up after each test
afterEach(() => {
  cleanup();
  if (worker) {
    worker.resetHandlers();
  }
  vi.clearAllMocks();
  vi.clearAllTimers();
});

// Final cleanup
afterAll(() => {
  if (worker) {
    worker.stop();
  }
  vi.resetAllMocks();
  vi.restoreAllMocks();
});
