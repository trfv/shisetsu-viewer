/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { ApolloClient, InMemoryCache, gql } from "@apollo/client";
import { renderWithProviders, screen, waitFor } from "../utils/test-utils";
import { createInstitution } from "../factories";
import { graphql, HttpResponse } from "msw";
import { server } from "../mocks/server";

// Sample queries
const GET_INSTITUTIONS = gql`
  query GetInstitutions($municipality: String, $limit: Int, $offset: Int) {
    institutions(municipality: $municipality, limit: $limit, offset: $offset) {
      id
      name
      municipality
      capacity
      facilities
    }
  }
`;

const CREATE_RESERVATION = gql`
  mutation CreateReservation($input: ReservationInput!) {
    createReservation(input: $input) {
      success
      reservation {
        id
        status
      }
      message
    }
  }
`;

describe("Apollo Client Integration Tests", () => {
  let client: ApolloClient<any>;

  beforeEach(() => {
    // Use a mock fetch that works with MSW
    client = new ApolloClient({
      cache: new InMemoryCache(),
      uri: "http://localhost/graphql", // MSW will intercept this
      defaultOptions: {
        watchQuery: {
          fetchPolicy: "network-only",
        },
        query: {
          fetchPolicy: "network-only",
        },
      },
    });
  });

  describe("Query Operations", () => {
    it("施設一覧を取得する", async () => {
      const mockInstitutions = Array.from({ length: 5 }, () => createInstitution());

      server.use(
        graphql.query("GetInstitutions", () => {
          return HttpResponse.json({
            data: { institutions: mockInstitutions },
          });
        })
      );

      const TestComponent = () => {
        const [data, setData] = React.useState<any>(null);

        React.useEffect(() => {
          client.query({ query: GET_INSTITUTIONS }).then((result) => setData(result.data));
        }, []);

        if (!data) return <div>Loading...</div>;

        return (
          <div>
            {data.institutions.map((inst: any) => (
              <div key={inst.id}>{inst.name}</div>
            ))}
          </div>
        );
      };

      renderWithProviders(<TestComponent />);

      await waitFor(() => {
        mockInstitutions.forEach((inst) => {
          expect(screen.getByText(inst.name)).toBeInTheDocument();
        });
      });
    });

    it("フィルター条件で施設を検索する", async () => {
      const tokyoInstitutions = Array.from({ length: 3 }, () =>
        createInstitution({ municipality: "東京都新宿区" })
      );

      server.use(
        graphql.query("GetInstitutions", ({ variables }: any) => {
          if (variables.municipality === "東京都新宿区") {
            return HttpResponse.json({
              data: { institutions: tokyoInstitutions },
            });
          }
          return HttpResponse.json({
            data: { institutions: [] },
          });
        })
      );

      const result = await client.query({
        query: GET_INSTITUTIONS,
        variables: { municipality: "東京都新宿区" },
      });

      expect(result.data.institutions).toHaveLength(3);
      result.data.institutions.forEach((inst: any) => {
        expect(inst.municipality).toBe("東京都新宿区");
      });
    });

    it("ページネーションが正しく動作する", async () => {
      const allInstitutions = Array.from({ length: 50 }, (_, i) =>
        createInstitution({ id: `inst-${i}`, name: `施設${i}` })
      );

      server.use(
        graphql.query("GetInstitutions", ({ variables }) => {
          const { limit = 10, offset = 0 } = variables;
          const paginatedData = allInstitutions.slice(offset, offset + limit);

          return HttpResponse.json({
            data: { institutions: paginatedData },
          });
        })
      );

      // First page
      const firstPage = await client.query({
        query: GET_INSTITUTIONS,
        variables: { limit: 10, offset: 0 },
      });
      expect(firstPage.data.institutions).toHaveLength(10);

      // Second page
      const secondPage = await client.query({
        query: GET_INSTITUTIONS,
        variables: { limit: 10, offset: 10 },
      });
      expect(secondPage.data.institutions).toHaveLength(10);

      // Different items
      expect(firstPage.data.institutions[0].id).not.toBe(secondPage.data.institutions[0].id);
    });
  });

  describe("Mutation Operations", () => {
    it("予約を作成する", async () => {
      const reservationInput = {
        institutionId: "inst-1",
        date: "2024-09-25",
        timeSlot: { start: "10:00", end: "12:00" },
        purpose: "バスケットボール練習",
        participants: 15,
      };

      server.use(
        graphql.mutation("CreateReservation", ({ variables }: any) => {
          return HttpResponse.json({
            data: {
              createReservation: {
                success: true,
                reservation: {
                  id: "new-res-1",
                  ...variables.input,
                  status: "pending",
                },
                message: "予約が作成されました",
              },
            },
          });
        })
      );

      const result = await client.mutate({
        mutation: CREATE_RESERVATION,
        variables: { input: reservationInput },
      });

      expect(result.data.createReservation.success).toBe(true);
      expect(result.data.createReservation.reservation.id).toBe("new-res-1");
      expect(result.data.createReservation.reservation.status).toBe("pending");
      expect(result.data.createReservation.message).toBe("予約が作成されました");
    });

    it("ミューテーションエラーを処理する", async () => {
      server.use(
        graphql.mutation("CreateReservation", () => {
          return HttpResponse.json({
            data: {
              createReservation: {
                success: false,
                reservation: null,
                message: "この時間帯はすでに予約されています",
              },
            },
          });
        })
      );

      const result = await client.mutate({
        mutation: CREATE_RESERVATION,
        variables: {
          input: { institutionId: "inst-1", date: "2024-09-25" },
        },
      });

      expect(result.data.createReservation.success).toBe(false);
      expect(result.data.createReservation.reservation).toBeNull();
      expect(result.data.createReservation.message).toContain("予約されています");
    });
  });

  describe("Cache Management", () => {
    it("キャッシュからデータを取得する", async () => {
      const institutions = Array.from({ length: 3 }, () => createInstitution());
      let queryCount = 0;

      server.use(
        graphql.query("GetInstitutions", () => {
          queryCount++;
          return HttpResponse.json({
            data: { institutions },
          });
        })
      );

      // First query - hits the server
      await client.query({ query: GET_INSTITUTIONS });
      expect(queryCount).toBe(1);

      // Second query - should use cache
      await client.query({
        query: GET_INSTITUTIONS,
        fetchPolicy: "cache-first",
      });
      expect(queryCount).toBe(1); // Still 1, not 2
    });

    it("ミューテーション後にキャッシュを更新する", async () => {
      const institutions = [createInstitution({ id: "inst-1", name: "体育館" })];

      server.use(
        graphql.query("GetInstitutions", () => {
          return HttpResponse.json({
            data: { institutions },
          });
        })
      );

      // Initial query
      await client.query({ query: GET_INSTITUTIONS });

      // Update cache manually after mutation
      client.cache.modify({
        fields: {
          institutions(existingInstitutions = []) {
            const newInstitution = {
              __typename: "Institution",
              id: "inst-2",
              name: "新しい施設",
            };
            return [...existingInstitutions, newInstitution];
          },
        },
      });

      // Query from cache
      const result = await client.query({
        query: GET_INSTITUTIONS,
        fetchPolicy: "cache-only",
      });

      expect(result.data.institutions).toHaveLength(2);
      expect(result.data.institutions[1].name).toBe("新しい施設");
    });
  });

  describe("Error Handling", () => {
    it("ネットワークエラーを処理する", async () => {
      server.use(
        graphql.query("GetInstitutions", () => {
          return HttpResponse.error();
        })
      );

      await expect(client.query({ query: GET_INSTITUTIONS })).rejects.toThrow();
    });

    it("GraphQLエラーを処理する", async () => {
      server.use(
        graphql.query("GetInstitutions", () => {
          return HttpResponse.json({
            errors: [
              {
                message: "Internal server error",
                extensions: { code: "INTERNAL_SERVER_ERROR" },
              },
            ],
          });
        })
      );

      await expect(client.query({ query: GET_INSTITUTIONS })).rejects.toThrow(
        "Internal server error"
      );
    });

    it("部分的なエラーレスポンスを処理する", async () => {
      server.use(
        graphql.query("GetInstitutions", () => {
          return HttpResponse.json({
            data: {
              institutions: [createInstitution()],
            },
            errors: [
              {
                message: "Some data could not be fetched",
                path: ["institutions", 1],
              },
            ],
          });
        })
      );

      const result = await client.query({
        query: GET_INSTITUTIONS,
        errorPolicy: "all",
      });

      expect(result.data.institutions).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.message).toContain("could not be fetched");
    });
  });

  describe("Optimistic Updates", () => {
    it("楽観的更新を実行する", async () => {
      const optimisticResponse = {
        createReservation: {
          __typename: "CreateReservationPayload",
          success: true,
          reservation: {
            __typename: "Reservation",
            id: "temp-id",
            status: "pending",
          },
          message: "予約を処理中...",
        },
      };

      server.use(
        graphql.mutation("CreateReservation", () => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(
                HttpResponse.json({
                  data: {
                    createReservation: {
                      success: true,
                      reservation: {
                        id: "actual-id",
                        status: "confirmed",
                      },
                      message: "予約が確定しました",
                    },
                  },
                })
              );
            }, 100);
          });
        })
      );

      let optimisticUpdateReceived = false;
      let finalUpdateReceived = false;

      const mutationPromise = client.mutate({
        mutation: CREATE_RESERVATION,
        variables: { input: { institutionId: "inst-1" } },
        optimisticResponse,
        update: (_, { data }) => {
          if (data?.createReservation.reservation.id === "temp-id") {
            optimisticUpdateReceived = true;
          }
          if (data?.createReservation.reservation.id === "actual-id") {
            finalUpdateReceived = true;
          }
        },
      });

      // Check optimistic update happened immediately
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(optimisticUpdateReceived).toBe(true);
      expect(finalUpdateReceived).toBe(false);

      // Wait for actual response
      await mutationPromise;
      expect(finalUpdateReceived).toBe(true);
    });
  });

  describe("Subscription Simulation", () => {
    it("リアルタイム更新をシミュレートする", async () => {
      // Note: Real subscriptions require WebSocket setup
      // This simulates the behavior with polling

      let pollCount = 0;
      const institutions = [createInstitution({ name: `施設${pollCount}` })];

      server.use(
        graphql.query("GetInstitutions", () => {
          pollCount++;
          return HttpResponse.json({
            data: {
              institutions: [...institutions, createInstitution({ name: `施設${pollCount}` })],
            },
          });
        })
      );

      // First query
      const result1 = await client.query({
        query: GET_INSTITUTIONS,
        fetchPolicy: "network-only",
      });
      expect(result1.data.institutions).toHaveLength(2);

      // Simulate update after delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second query (simulating subscription update)
      const result2 = await client.query({
        query: GET_INSTITUTIONS,
        fetchPolicy: "network-only",
      });
      expect(result2.data.institutions).toHaveLength(2);
      expect(result2.data.institutions[1].name).toBe("施設2");
    });
  });
});
