import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { graphqlRequest } from "../graphqlClient.ts";

const QUERY = `
query institutionDetail($id: uuid!) {
  institutions_connection(where: { id: { _eq: $id } }, first: 1) {
    edges {
      node {
        id
        prefecture
        municipality
        building
        institution
        capacity
        area
        fee_divisions
        weekday_usage_fee
        holiday_usage_fee
        address
        is_available_strings
        is_available_woodwind
        is_available_brass
        is_available_percussion
        is_equipped_music_stand
        is_equipped_piano
        website_url
        layout_image_url
        lottery_period
        note
      }
    }
  }
}`;

interface QueryData {
  institutions_connection: {
    edges: Array<{ node: Record<string, unknown> }>;
  };
}

export function registerGetInstitutionDetail(server: McpServer): void {
  server.registerTool(
    "get_institution_detail",
    {
      description: "施設の詳細情報を取得（ID指定）",
      inputSchema: {
        id: z.string().uuid().describe("施設のUUID"),
      },
    },
    async (args) => {
      const data = await graphqlRequest<QueryData>(QUERY, { id: args.id });
      const node = data.institutions_connection.edges[0]?.node;

      if (!node) {
        return {
          content: [
            { type: "text" as const, text: JSON.stringify({ error: "施設が見つかりません" }) },
          ],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(node, null, 2) }],
      };
    }
  );
}
