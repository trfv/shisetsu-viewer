import { SELF } from "cloudflare:test";
import { expect, it } from "vitest";

it("GET /v1/health が 200 と ok を返す", async () => {
  const res = await SELF.fetch("https://api.example.com/v1/health");
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});
