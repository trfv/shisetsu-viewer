import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { graphqlRequest } from "../graphqlClient.ts";
import { RESERVATION_FIELDS } from "../fieldDefinitions.ts";
import { buildFieldSelection } from "../buildFieldSelection.ts";

function buildQuery(fieldSelection: string): string {
  return `
query institutionReservations($id: uuid!, $startDate: date, $endDate: date) {
  reservations_connection(
    where: { institution_id: { _eq: $id }, date: { _gte: $startDate, _lte: $endDate } }
    order_by: { date: asc }
    first: 1000
  ) {
    edges {
      node {
        ${fieldSelection}
      }
    }
  }
}`;
}

interface QueryData {
  reservations_connection: {
    edges: Array<{ node: Record<string, unknown> }>;
  };
}

export function registerGetInstitutionReservations(server: McpServer): void {
  server.registerTool(
    "get_institution_reservations",
    {
      description: "施設の予約状況を取得（日付範囲指定、上限1000件）",
      inputSchema: {
        institutionId: z.string().uuid().describe("施設のUUID"),
        startDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("開始日 (YYYY-MM-DD)"),
        endDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("終了日 (YYYY-MM-DD)"),
        fields: z
          .array(z.enum(RESERVATION_FIELDS))
          .optional()
          .describe(
            "返却フィールドを指定 (省略時は全フィールド)。選択可能: " +
              RESERVATION_FIELDS.join(", ")
          ),
      },
    },
    async (args) => {
      const query = buildQuery(buildFieldSelection(RESERVATION_FIELDS, args.fields));
      const data = await graphqlRequest<QueryData>(query, {
        id: args.institutionId,
        startDate: args.startDate,
        endDate: args.endDate,
      });

      const reservations = data.reservations_connection.edges.map((e) => e.node);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ reservations, count: reservations.length }, null, 2),
          },
        ],
      };
    }
  );
}
