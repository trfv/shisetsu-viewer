import type { McpServer } from "@modelcontextprotocol/server";
import { RESERVATION_SYSTEMS } from "@shisetsu-viewer/shared";

export function registerReservationSystemsResource(server: McpServer): void {
  server.registerResource(
    "reservation-systems",
    "shisetsu://reservation-systems",
    {
      description:
        "予約システムのレジストリ（予約システムキー、所属自治体、予約ステータス/時間区分/料金区分ラベル）",
      mimeType: "application/json",
      // 認証付きのエンドポイントなので、共有キャッシュには載せない
      cacheHint: { ttlMs: 24 * 60 * 60 * 1000, cacheScope: "private" },
    },
    async () => ({
      contents: [
        {
          uri: "shisetsu://reservation-systems",
          mimeType: "application/json",
          text: JSON.stringify(RESERVATION_SYSTEMS, null, 2),
        },
      ],
    })
  );
}
