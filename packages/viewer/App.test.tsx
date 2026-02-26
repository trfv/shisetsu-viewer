import { describe, it, expect, vi } from "vitest";

// Mock the router to avoid creating a real browser router
vi.mock("./router", () => ({
  router: {
    navigate: vi.fn(),
    state: { location: { pathname: "/" } },
    subscribe: vi.fn(() => vi.fn()),
    enableScrollRestoration: vi.fn(),
  },
}));

// Mock the client to avoid real GraphQL connections
vi.mock("./utils/client", () => ({
  client: () => ({
    link: {},
    cache: {
      read: vi.fn(),
      write: vi.fn(),
      diff: vi.fn(),
      watch: vi.fn(),
      restore: vi.fn(),
      extract: vi.fn(),
      reset: vi.fn(),
      evict: vi.fn(),
      gc: vi.fn(),
      identify: vi.fn(),
      modify: vi.fn(),
      readQuery: vi.fn(),
      readFragment: vi.fn(),
      writeQuery: vi.fn(),
      writeFragment: vi.fn(),
      transformDocument: vi.fn(),
      transformForLink: vi.fn(),
      acquire: vi.fn(),
      release: vi.fn(),
      performTransaction: vi.fn(),
      retain: vi.fn(),
      addTypenameToDocument: vi.fn(),
    },
    watchQuery: vi.fn(),
    query: vi.fn(),
    mutate: vi.fn(),
    subscribe: vi.fn(),
    readQuery: vi.fn(),
    readFragment: vi.fn(),
    writeQuery: vi.fn(),
    writeFragment: vi.fn(),
  }),
  ClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import React from "react";
import { render } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("エラーなくレンダリングされる", () => {
    expect(() => render(<App />)).not.toThrow();
  });
});
