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

import { API_ENDPOINT } from "../constants/env";
import { apiGet } from "./client";

export function fetchInstitutions(
  params: InstitutionsQueryParams,
  cursor: string | null
): Promise<Page<InstitutionSummary>> {
  return apiGet(`${API_ENDPOINT}/v1/institutions`, { ...params, cursor });
}

export function fetchInstitutionDetail(id: string): Promise<InstitutionDetail> {
  return apiGet(`${API_ENDPOINT}/v1/institutions/${id}`, {});
}

export function fetchInstitutionReservations(
  id: string,
  params: { startDate?: string; endDate?: string; limit?: number },
  cursor: string | null,
  token: string
): Promise<Page<ReservationDto>> {
  return apiGet(`${API_ENDPOINT}/v1/institutions/${id}/reservations`, { ...params, cursor }, token);
}

export function searchReservations(
  params: ReservationSearchQueryParams,
  cursor: string | null,
  token: string
): Promise<Page<ReservationSearchHit>> {
  return apiGet(`${API_ENDPOINT}/v1/reservations/search`, { ...params, cursor }, token);
}

export function fetchScrapeRuns(): Promise<{ items: ScrapeRun[] }> {
  return apiGet(`${API_ENDPOINT}/v1/scrape-runs`, {});
}
