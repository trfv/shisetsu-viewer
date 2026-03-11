import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerSearchAvailableRoomsPrompt(server: McpServer): void {
  server.registerPrompt(
    "search_available_rooms",
    {
      title: "空き施設検索",
      description: "条件を指定して空いている音楽練習施設を検索するプロンプト",
      argsSchema: {
        area: z.string().optional().describe("エリア名（例: 江東区、川崎市）"),
        date: z.string().optional().describe("日付や期間（例: 来週末、3月15日）"),
        timeSlot: z.string().optional().describe("時間帯（午前 / 午後 / 夜間）"),
        instrument: z
          .string()
          .optional()
          .describe("楽器種類（弦楽器 / 木管楽器 / 金管楽器 / 打楽器）"),
      },
    },
    async (args) => {
      const conditions = [
        args.area ? `エリア: ${args.area}` : null,
        args.date ? `日時: ${args.date}` : null,
        args.timeSlot ? `時間帯: ${args.timeSlot}` : null,
        args.instrument ? `楽器: ${args.instrument}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const text = `以下の条件で空いている音楽練習施設を探してください。

${conditions || "（条件指定なし — おすすめの施設を提案してください）"}

search_reservations ツールを使って検索し、結果を以下の形式で整理してください:
- 施設名（建物名 + 部屋名）
- 日付と空き時間帯
- 自治体名`;

      return {
        messages: [
          {
            role: "user" as const,
            content: { type: "text" as const, text },
          },
        ],
      };
    }
  );
}
