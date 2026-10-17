import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";

import type { DataSource, WritableDataSource } from "../data/dataSource.ts";
import { createServer } from "./createServer.ts";

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

async function connect(ds: DataSource) {
  const server = createServer({ dataSource: ds, allowReservations: false });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe("ツール呼び出し", () => {
  it("結果を JSON のテキストで返す", async () => {
    const client = await connect({
      listInstitutions: async () => ({
        items: [],
        pageInfo: { hasNextPage: false, endCursor: null },
      }),
    } as unknown as DataSource);
    const result = await client.callTool({ name: "list_institutions", arguments: {} });
    const [content] = result.content as { type: string; text: string }[];
    expect(JSON.parse(content!.text)).toEqual({
      institutions: [],
      pageInfo: { hasNextPage: false, endCursor: null },
      count: 0,
    });
    await client.close();
  });

  it("施設が無ければ isError を返す", async () => {
    const client = await connect({
      getInstitutionDetail: async () => null,
    } as unknown as DataSource);
    const result = await client.callTool({
      name: "get_institution_detail",
      arguments: { id: "00000000-0000-0000-0000-000000000001" },
    });
    expect(result.isError).toBe(true);
    await client.close();
  });
});
