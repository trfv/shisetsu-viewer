import type { McpServer } from "@modelcontextprotocol/server";
import { MUNICIPALITIES } from "@shisetsu-viewer/shared";

export function registerMunicipalitiesResource(server: McpServer): void {
  server.registerResource(
    "municipalities",
    "shisetsu://municipalities",
    {
      description: "自治体レジストリ（自治体キー、名称、都道府県）",
      mimeType: "application/json",
      // 認証付きのエンドポイントなので、共有キャッシュには載せない
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
