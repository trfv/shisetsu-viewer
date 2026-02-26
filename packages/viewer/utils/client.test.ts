import { describe, it, expect } from "vitest";
import { client } from "./client";

describe("client", () => {
  it("トークンありでApolloClientインスタンスを作成する", () => {
    const apolloClient = client("test-token");
    expect(apolloClient).toBeDefined();
    expect(apolloClient.link).toBeDefined();
    expect(apolloClient.cache).toBeDefined();
  });

  it("空トークンでもApolloClientインスタンスを作成する", () => {
    const apolloClient = client("");
    expect(apolloClient).toBeDefined();
    expect(apolloClient.link).toBeDefined();
  });
});
