import { describe, it, expect } from "vitest";
import { router } from "./router";

describe("router", () => {
  it("ルーターが定義されている", () => {
    expect(router).toBeDefined();
  });

  it("ルートパスにルートが定義されている", () => {
    const routes = router.routes;
    expect(routes).toBeDefined();
    expect(routes.length).toBeGreaterThan(0);
    expect(routes[0].path).toBe("/");
  });

  it("子ルートが定義されている", () => {
    const children = router.routes[0].children;
    expect(children).toBeDefined();
    expect(children!.length).toBe(5);
  });
});
