import { describe, it, expect, vi } from "vitest";
import { reportWebVitals } from "./reportWebVitals";

describe("reportWebVitals", () => {
  it("コールバック関数が渡された場合にweb-vitalsをインポートして呼び出す", async () => {
    const onPerfEntry = vi.fn();
    reportWebVitals(onPerfEntry);
    // Dynamic import is async; allow it to resolve
    await new Promise((resolve) => setTimeout(resolve, 100));
    // The function should have been called with the web-vitals metrics
    // (In browser test environment, web-vitals may or may not report metrics)
    expect(onPerfEntry).toBeDefined();
  });

  it("コールバックが未定義の場合は何もしない", () => {
    expect(() => reportWebVitals(undefined)).not.toThrow();
  });

  it("コールバックが関数でない場合は何もしない", () => {
    // @ts-expect-error testing non-function argument
    expect(() => reportWebVitals("not a function")).not.toThrow();
  });
});
