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

const BASE = import.meta.env.VITE_API_ENDPOINT;

export const handlers = [
  // institutions list (Institution page)
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

  // institution reservations (Detail page - reservation tab)
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

  // institution detail (Detail page) — 具体パスの後に置く
  http.get(`${BASE}/v1/institutions/:id`, () => HttpResponse.json(createMockInstitutionDetail())),

  // searchable reservations (Reservation page)
  http.get(`${BASE}/v1/reservations/search`, () =>
    HttpResponse.json(createMockReservationSearchPage([createMockReservationSearchHit()]))
  ),
];
