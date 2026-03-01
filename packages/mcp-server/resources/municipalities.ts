import { MUNICIPALITIES } from "@shisetsu-viewer/shared";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerMunicipalitiesResource(server: McpServer): void {
  server.registerResource(
    "municipalities",
    "shisetsu://municipalities",
    {
      description: "自治体レジストリ（自治体キー、ラベル、予約ステータス/区分ラベル）",
      mimeType: "application/json",
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
