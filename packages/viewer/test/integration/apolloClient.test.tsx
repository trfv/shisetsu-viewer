/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { ApolloClient, InMemoryCache, HttpLink, gql } from "@apollo/client";
import { renderWithProviders, screen, waitFor } from "../utils/test-utils";
import { graphql, HttpResponse } from "msw";
import { InstitutionsQuery } from "../../api/gql/graphql";

interface ReservationMutation {
  createReservation: {
    success?: boolean;
    reservation: {
      id: string;
      institutionId?: string;
      status?: string;
    } | null;
    message: string;
  };
}

const createDataset = (size: number) => {
  return Array.from({ length: size }, (_, index) => ({
    __typename: "institutions",
    id: `institution-${index + 1}`,
    name: `institution-${index + 1}`,
    municipality: "東京都新宿区",
    capacity: 20 + index,
  }));
};

// Sample queries
const GET_INSTITUTIONS = gql`
  query GetInstitutions($municipality: String, $limit: Int, $offset: Int) {
    institutions(municipality: $municipality, limit: $limit, offset: $offset) {
      id
      name
      municipality
      capacity
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
  let client: ApolloClient;
  let server: any;

  beforeEach(async () => {
    // Import server dynamically based on environment
    if (typeof window !== "undefined") {
      const { worker } = await import("../mocks/browser");
      server = worker;
    } else {
      const { server: nodeServer } = await import("../mocks/server");
      server = nodeServer;
    }
    // Use a mock fetch that works with MSW
    const httpLink = new HttpLink({
      uri: "http://localhost/graphql", // MSW will intercept this
    });

    client = new ApolloClient({
      link: httpLink,
      cache: new InMemoryCache(),
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
      const mockInstitutions = createDataset(5);

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
          client.query({ query: GET_INSTITUTIONS }).then((result: any) => setData(result.data));
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
      const tokyoInstitutions = createDataset(3);

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

      const result = await client.query<InstitutionsQuery>({
        query: GET_INSTITUTIONS,
        variables: { municipality: "東京都新宿区" },
      });

      expect(result.data?.institutions).toHaveLength(3);
      result.data?.institutions.forEach((inst) => {
        expect(inst.municipality).toBe("東京都新宿区");
      });
    });

    it("ページネーションが正しく動作する", async () => {
      const allInstitutions = createDataset(50);

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
      const firstPage = await client.query<InstitutionsQuery>({
        query: GET_INSTITUTIONS,
        variables: { limit: 10, offset: 0 },
      });
      expect(firstPage.data?.institutions).toHaveLength(10);

      // Second page
      const secondPage = await client.query<InstitutionsQuery>({
        query: GET_INSTITUTIONS,
        variables: { limit: 10, offset: 10 },
      });
      expect(secondPage.data?.institutions).toHaveLength(10);

      // Different items
      if (firstPage.data && secondPage.data) {
        expect(firstPage.data.institutions[0]?.id).not.toBe(secondPage.data.institutions[0]?.id);
      }
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

      const result = await client.mutate<ReservationMutation>({
        mutation: CREATE_RESERVATION,
        variables: { input: reservationInput },
      });

      expect(result.data?.createReservation.reservation?.id).toBe("new-res-1");
      expect(result.data?.createReservation.message).toBe("予約が作成されました");
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

      const result = await client.mutate<ReservationMutation>({
        mutation: CREATE_RESERVATION,
        variables: {
          input: { institutionId: "inst-1", date: "2024-09-25" },
        },
      });

      expect(result.data?.createReservation.success).toBe(false);
      expect(result.data?.createReservation.reservation).toBeNull();
      expect(result.data?.createReservation.message).toContain("予約されています");
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
              institutions: createDataset(1),
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

      const result = await client.query<InstitutionsQuery>({
        query: GET_INSTITUTIONS,
        errorPolicy: "all",
      });

      expect(result.data?.institutions).toHaveLength(1);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("could not be fetched");
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
        update: (_: any, { data }: any) => {
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
});
