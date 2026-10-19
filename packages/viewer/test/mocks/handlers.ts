import { http, HttpResponse } from "msw";

import {
  createMockInstitutionDetail,
  createMockInstitutionsPage,
  createMockInstitutionSummary,
  createMockReservationDto,
  createMockReservationsPage,
  createMockReservationSearchHit,
  createMockReservationSearchPage,
} from "./data";

const BASE = "/api";

export const handlers = [
  http.get("/auth/me", () =>
    HttpResponse.json({
      authenticated: true,
      anonymous: false,
      trial: false,
    })
  ),

  http.get(`${BASE}/v1/institutions`, () =>
    HttpResponse.json(
      createMockInstitutionsPage([
        createMockInstitutionSummary(),
        createMockInstitutionSummary({
          id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          building: "テスト市民ホール",
          institution: "大ホール",
          municipality: "MUNICIPALITY_ARAKAWA",
          institution_size: "INSTITUTION_SIZE_LARGE",
        }),
      ])
    )
  ),

  http.get(`${BASE}/v1/institutions/:id/reservations`, () =>
    HttpResponse.json(
      createMockReservationsPage([
        createMockReservationDto(),
        createMockReservationDto({
          date: "2024-10-02",
          updated_at: "2024-10-01T12:00:00",
        }),
      ])
    )
  ),

  http.get(`${BASE}/v1/institutions/:id`, () => HttpResponse.json(createMockInstitutionDetail())),

  http.get(`${BASE}/v1/reservations/search`, () =>
    HttpResponse.json(createMockReservationSearchPage([createMockReservationSearchHit()]))
  ),

  http.get(`${BASE}/v1/scrape-runs`, () => HttpResponse.json({ items: [] })),
];
