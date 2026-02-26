import { graphql, HttpResponse } from "msw";
import {
  createMockInstitutionNode,
  createMockInstitutionsConnection,
  createMockInstitutionDetailNode,
  createMockInstitutionDetailConnection,
  createMockInstitutionReservationsConnection,
  createMockReservationNode,
  createMockSearchableReservationNode,
  createMockSearchableReservationsConnection,
} from "./data";

export const handlers = [
  // institutions list query (Institution page)
  graphql.query("institutions", () => {
    return HttpResponse.json(
      createMockInstitutionsConnection([
        createMockInstitutionNode(),
        createMockInstitutionNode({
          id: btoa(
            JSON.stringify([1, "public", "institutions", "a1b2c3d4-e5f6-7890-abcd-ef1234567890"])
          ),
          building: "テスト市民ホール",
          institution: "大ホール",
          municipality: "MUNICIPALITY_ARAKAWA",
          institution_size: "INSTITUTION_SIZE_LARGE",
        }),
      ])
    );
  }),

  // institution detail query (Detail page)
  graphql.query("institutionDetail", () => {
    return HttpResponse.json(
      createMockInstitutionDetailConnection(createMockInstitutionDetailNode())
    );
  }),

  // institution reservations query (Detail page - reservation tab)
  graphql.query("institutionReservations", () => {
    return HttpResponse.json(
      createMockInstitutionReservationsConnection([
        createMockReservationNode(),
        createMockReservationNode({
          id: "reservation-2",
          date: "2024-10-02",
          updated_at: "2024-10-01T12:00:00",
        }),
      ])
    );
  }),

  // searchable reservations query (Reservation page)
  graphql.query("reservations", () => {
    return HttpResponse.json(
      createMockSearchableReservationsConnection([createMockSearchableReservationNode()])
    );
  }),
];
