/* eslint-disable @typescript-eslint/no-explicit-any */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, afterAll, vi } from "vitest";
import { server } from "./mocks/server";

// Start MSW server
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });

  // Mock matchMedia
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

  // Mock IntersectionObserver
  globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: "",
    thresholds: [],
    takeRecords: vi.fn().mockReturnValue([]),
  }));

  // Mock ResizeObserver
  globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock scrollTo
  window.scrollTo = vi.fn();

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
});

// Clean up after each test
afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

// Final cleanup
afterAll(() => {
  server.close();
  vi.resetAllMocks();
  vi.restoreAllMocks();
});
