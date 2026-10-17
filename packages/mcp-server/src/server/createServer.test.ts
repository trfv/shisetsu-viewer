import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import type { VersionNegotiationMode } from "@modelcontextprotocol/client";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";

import type { DataSource, WritableDataSource } from "../data/dataSource.ts";
import { createServer } from "./createServer.ts";

/**
 * worker と同じく createMcpHandler 越しに HTTP で話す。2026-07-28（initialize なし）と
 * 2025 系（initialize あり）の両方のクライアントに、同じ factory で応えることを確かめる。
 */
const ERAS: [string, VersionNegotiationMode][] = [
  ["2026-07-28", { pin: "2026-07-28" }],
  ["2025 系（initialize）", "legacy"],
];

/** クライアントが送った JSON-RPC のメソッド名 */
const sentMethods: string[] = [];

async function connect(
  mode: VersionNegotiationMode,
  options: { dataSource: DataSource; allowReservations: boolean; write?: WritableDataSource }
): Promise<Client> {
  const handler = createMcpHandler(() => createServer(options));
  const transport = new StreamableHTTPClientTransport(new URL("https://mcp.test/mcp"), {
    fetch: async (url, init) => {
      const request = new Request(url, init);
      const body = (await request
        .clone()
        .json()
        .catch(() => null)) as { method?: string } | null;
      if (body?.method) sentMethods.push(body.method);
      return handler.fetch(request);
    },
  });
  const client = new Client({ name: "test", version: "0.0.0" }, { versionNegotiation: { mode } });
  await client.connect(transport);
  return client;
}

// ツール登録ゲートの検証のみ。ツールは呼ばないので実装は空でよい。
const dataSource = {} as DataSource;
const write = {} as WritableDataSource;

describe.each(ERAS)("%s のクライアント", (era, mode) => {
  it("2026-07-28 なら initialize を送らず、2025 系なら送る", async () => {
    sentMethods.length = 0;
    const client = await connect(mode, { dataSource, allowReservations: false });
    await client.listTools();
    await client.close();
    expect(sentMethods.includes("initialize")).toBe(era !== "2026-07-28");
  });

  async function registeredToolNames(options: {
    allowReservations: boolean;
    write?: WritableDataSource;
  }): Promise<string[]> {
    const client = await connect(mode, { dataSource, ...options });
    const { tools } = await client.listTools();
    await client.close();
    return tools.map((t) => t.name).sort();
  }

  it("allowReservations が false（anonymous）なら予約系ツールを隠す", async () => {
    const names = await registeredToolNames({ allowReservations: false });
    expect(names).toEqual(["get_institution_detail", "list_institutions"]);
  });

  it("allowReservations が true（user）なら予約系ツールを出し、書き込み系は出さない", async () => {
    const names = await registeredToolNames({ allowReservations: true });
    expect(names).toContain("get_institution_reservations");
    expect(names).toContain("search_reservations");
    expect(names).not.toContain("upsert_reservations");
  });

  it("WritableDataSource を渡したときだけ書き込み系ツールを出す", async () => {
    const names = await registeredToolNames({ allowReservations: true, write });
    expect(names).toContain("upsert_reservations");
    expect(names).toContain("upsert_institutions");
  });

  it("結果を structuredContent と JSON のテキストの両方で返す", async () => {
    const expected = {
      institutions: [],
      pageInfo: { hasNextPage: false, endCursor: null },
      count: 0,
    };
    const client = await connect(mode, {
      dataSource: {
        listInstitutions: async () => ({
          items: [],
          pageInfo: { hasNextPage: false, endCursor: null },
        }),
      } as unknown as DataSource,
      allowReservations: false,
    });
    const result = await client.callTool({ name: "list_institutions", arguments: {} });
    expect(result.structuredContent).toEqual(expected);
    const [content] = result.content as { type: string; text: string }[];
    expect(JSON.parse(content!.text)).toEqual(expected);
    await client.close();
  });

  it("施設が無ければ isError を返す", async () => {
    const client = await connect(mode, {
      dataSource: { getInstitutionDetail: async () => null } as unknown as DataSource,
      allowReservations: false,
    });
    const result = await client.callTool({
      name: "get_institution_detail",
      arguments: { id: "00000000-0000-0000-0000-000000000001" },
    });
    expect(result.isError).toBe(true);
    await client.close();
  });
});
