import type {
  InstitutionDetail,
  InstitutionsQueryParams,
  InstitutionSummary,
  Page,
  ReservationDto,
  ReservationSearchHit,
  ReservationSearchQueryParams,
  ScrapeRun,
} from "@shisetsu-viewer/shared";

import { apiGet } from "./client";

// BFF が同一オリジンで /api/* を api へ転送する。エンドポイントの環境変数は不要。
const BASE = "/api";

export function fetchInstitutions(
  params: InstitutionsQueryParams,
  cursor: string | null
): Promise<Page<InstitutionSummary>> {
  return apiGet(`${BASE}/v1/institutions`, { ...params, cursor });
}

export function fetchInstitutionDetail(id: string): Promise<InstitutionDetail> {
  return apiGet(`${BASE}/v1/institutions/${id}`, {});
}

export function fetchInstitutionReservations(
  id: string,
  params: { startDate?: string; endDate?: string; limit?: number },
  cursor: string | null
): Promise<Page<ReservationDto>> {
  return apiGet(`${BASE}/v1/institutions/${id}/reservations`, { ...params, cursor });
}

export function searchReservations(
  params: ReservationSearchQueryParams,
  cursor: string | null
): Promise<Page<ReservationSearchHit>> {
  return apiGet(`${BASE}/v1/reservations/search`, { ...params, cursor });
}

export function fetchScrapeRuns(): Promise<{ items: ScrapeRun[] }> {
  return apiGet(`${BASE}/v1/scrape-runs`, {});
}
