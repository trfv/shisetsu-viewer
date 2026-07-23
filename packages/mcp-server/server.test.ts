import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";

import type { DataSource, WritableDataSource } from "./dataSource.ts";
import { createServer } from "./server.ts";

// ツール登録ゲートの検証のみ。ツールは呼ばないので実装は空でよい。
const dataSource = {} as DataSource;
const write = {} as WritableDataSource;

async function registeredToolNames(options: {
  allowReservations: boolean;
  write?: WritableDataSource;
}): Promise<string[]> {
  const server = createServer({ dataSource, ...options });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const { tools } = await client.listTools();
  await client.close();
  return tools.map((t) => t.name).sort();
}

describe("createServer tool gating", () => {
  it("hides reservations tools when allowReservations is false (anonymous)", async () => {
    const names = await registeredToolNames({ allowReservations: false });
    expect(names).toEqual(["get_institution_detail", "list_institutions"]);
    expect(names).not.toContain("get_institution_reservations");
    expect(names).not.toContain("search_reservations");
  });

  it("exposes reservations tools when allowReservations is true (user)", async () => {
    const names = await registeredToolNames({ allowReservations: true });
    expect(names).toContain("get_institution_reservations");
    expect(names).toContain("search_reservations");
    expect(names).not.toContain("upsert_reservations");
  });

  it("registers write tools only when a WritableDataSource is provided", async () => {
    const names = await registeredToolNames({ allowReservations: true, write });
    expect(names).toContain("upsert_reservations");
    expect(names).toContain("upsert_institutions");
  });
});
