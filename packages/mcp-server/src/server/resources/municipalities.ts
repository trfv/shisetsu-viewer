import type { McpServer } from "@modelcontextprotocol/server";
import { MUNICIPALITIES } from "@shisetsu-viewer/shared";

export function registerMunicipalitiesResource(server: McpServer): void {
  server.registerResource(
    "municipalities",
    "shisetsu://municipalities",
    {
      description: "自治体レジストリ（自治体キー、ラベル、予約ステータス/区分ラベル）",
      mimeType: "application/json",
      // 中身はデプロイ時に固定される registry なので、クライアントに 1 日キャッシュさせる。
      // 認証付きのエンドポイントなので、共有キャッシュには載せない（private）
      cacheHint: { ttlMs: 24 * 60 * 60 * 1000, cacheScope: "private" },
    },
    async () => ({
      contents: [
        {
          uri: "shisetsu://municipalities",
          mimeType: "application/json",
          text: JSON.stringify(MUNICIPALITIES, null, 2),
        },
      ],
    })
  );
}
