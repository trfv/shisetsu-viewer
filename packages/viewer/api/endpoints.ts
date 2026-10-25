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

const BASE = "/api";

// api は municipality が空だと絞り込まずに全件を返す。地区を全部外したときは呼ばない。
const isNoMunicipality = (municipality: string[] | undefined): boolean =>
  municipality?.length === 0;

const emptyPage = <T>(): Promise<Page<T>> =>
  Promise.resolve({ items: [], pageInfo: { hasNextPage: false, endCursor: null } });

export function fetchInstitutions(
  params: InstitutionsQueryParams,
  cursor: string | null
): Promise<Page<InstitutionSummary>> {
  if (isNoMunicipality(params.municipality)) return emptyPage();
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
  if (isNoMunicipality(params.municipality)) return emptyPage();
  return apiGet(`${BASE}/v1/reservations/search`, { ...params, cursor });
}

export function fetchScrapeRuns(): Promise<{ items: ScrapeRun[] }> {
  return apiGet(`${BASE}/v1/scrape-runs`, {});
}
