import { describe, expect, it } from "vitest";

import { importKeys, seal, toBase64Url, unseal } from "./session.ts";

const newKey = () => toBase64Url(crypto.getRandomValues(new Uint8Array(32)));

describe("seal / unseal", () => {
  it("暗号化した値を同じ鍵で復号できる", async () => {
    const keys = await importKeys(JSON.stringify([newKey()]));
    const sealed = await seal(keys, "__Host-session", { a: 1 });

    expect(await unseal(keys, "__Host-session", sealed)).toEqual({ a: 1 });
  });

  it("暗号文に平文が現れない", async () => {
    const keys = await importKeys(JSON.stringify([newKey()]));
    const sealed = await seal(keys, "__Host-session", { refreshToken: "secret-refresh" });

    expect(sealed).not.toContain("secret-refresh");
    expect(atob(sealed.replace(/-/g, "+").replace(/_/g, "/"))).not.toContain("secret-refresh");
  });

  it("旧鍵で暗号化した値も、鍵の配列に残っていれば復号できる", async () => {
    const oldKey = newKey();
    const sealed = await seal(await importKeys(JSON.stringify([oldKey])), "x", "v");
    const rotated = await importKeys(JSON.stringify([newKey(), oldKey]));

    expect(await unseal(rotated, "x", sealed)).toBe("v");
  });

  it("配列から外した鍵の値は null になる", async () => {
    const sealed = await seal(await importKeys(JSON.stringify([newKey()])), "x", "v");

    expect(await unseal(await importKeys(JSON.stringify([newKey()])), "x", sealed)).toBeNull();
  });

  it("別の名前の Cookie に貼り替えた値は復号できない", async () => {
    const keys = await importKeys(JSON.stringify([newKey()]));
    const sealed = await seal(keys, "__Host-oauth", { state: "s" });

    expect(await unseal(keys, "__Host-session", sealed)).toBeNull();
  });

  it("改ざんした値は null になる", async () => {
    const keys = await importKeys(JSON.stringify([newKey()]));
    const sealed = await seal(keys, "x", { a: 1 });
    const tampered = `${sealed.slice(0, -2)}${sealed.at(-2) === "A" ? "B" : "A"}${sealed.slice(-1)}`;

    expect(await unseal(keys, "x", tampered)).toBeNull();
    expect(await unseal(keys, "x", "!!!")).toBeNull();
    expect(await unseal(keys, "x", "")).toBeNull();
  });

  it("鍵が空なら起動時に気づけるよう例外にする", async () => {
    await expect(importKeys("[]")).rejects.toThrow();
  });
});
