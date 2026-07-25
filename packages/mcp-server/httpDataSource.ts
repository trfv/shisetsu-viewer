import type {
  Institution,
  InstitutionDetail,
  InstitutionsQueryParams,
  InstitutionSummary,
  Page,
  ReservationDto,
  ReservationSearchHit,
  ReservationSearchQueryParams,
  UpsertReservationsRequest,
  UpsertResponse,
} from "@shisetsu-viewer/shared";

import { RESERVATIONS_HARD_CAP, type WritableDataSource } from "./dataSource.ts";

interface HttpAuth {
  bearer?: string | undefined;
  adminKey?: string | undefined;
}

function authHeaders(auth: HttpAuth): Record<string, string> {
  const headers: Record<string, string> = {};
  if (auth.bearer) headers["Authorization"] = `Bearer ${auth.bearer}`;
  if (auth.adminKey) headers["X-Admin-Key"] = auth.adminKey;
  return headers;
}

function appendList(sp: URLSearchParams, key: string, values: string[] | undefined): void {
  if (values && values.length > 0) sp.set(key, values.join(","));
}

function appendBool(sp: URLSearchParams, key: string, value: boolean | undefined): void {
  if (value === true) sp.set(key, "true");
}

function appendNum(sp: URLSearchParams, key: string, value: number | undefined): void {
  if (value !== undefined) sp.set(key, String(value));
}

function appendStr(sp: URLSearchParams, key: string, value: string | undefined): void {
  if (value !== undefined && value !== "") sp.set(key, value);
}

/**
 * stdio / CLI 用 DataSource。api.shisetsudb.com（`endpoint`）への fetch で実装する。
 * 認証は Bearer（ユーザートークン、CLI）または X-Admin-Key（stdio 管理用）。
 */
export function createHttpDataSource(endpoint: string, auth: HttpAuth): WritableDataSource {
  const base = endpoint.replace(/\/$/, "");
  const headers = authHeaders(auth);

  async function getJson<T>(pathAndQuery: string): Promise<T> {
    const response = await fetch(`${base}${pathAndQuery}`, { headers });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${await response.text()}`);
    }
    return response.json() as Promise<T>;
  }

  async function putJson<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${base}${path}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${await response.text()}`);
    }
    return response.json() as Promise<T>;
  }

  return {
    async listInstitutions(params: InstitutionsQueryParams): Promise<Page<InstitutionSummary>> {
      const sp = new URLSearchParams();
      appendList(sp, "municipality", params.municipality);
      appendBool(sp, "isAvailableStrings", params.isAvailableStrings);
      appendBool(sp, "isAvailableWoodwind", params.isAvailableWoodwind);
      appendBool(sp, "isAvailableBrass", params.isAvailableBrass);
      appendBool(sp, "isAvailablePercussion", params.isAvailablePercussion);
      appendList(sp, "institutionSizes", params.institutionSizes);
      appendNum(sp, "limit", params.limit);
      appendStr(sp, "cursor", params.cursor);
      return getJson<Page<InstitutionSummary>>(`/v1/institutions?${sp.toString()}`);
    },

    async getInstitutionDetail(id: string): Promise<InstitutionDetail | null> {
      const response = await fetch(`${base}/v1/institutions/${id}`, { headers });
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${await response.text()}`);
      }
      return response.json() as Promise<InstitutionDetail>;
    },

    async getInstitutionReservations(
      id: string,
      range: { startDate: string; endDate?: string | undefined }
    ): Promise<ReservationDto[]> {
      const items: ReservationDto[] = [];
      let cursor: string | undefined;
      do {
        const sp = new URLSearchParams();
        appendStr(sp, "startDate", range.startDate);
        appendStr(sp, "endDate", range.endDate);
        sp.set("limit", "100");
        appendStr(sp, "cursor", cursor);
        const page = await getJson<Page<ReservationDto>>(
          `/v1/institutions/${id}/reservations?${sp.toString()}`
        );
        items.push(...page.items);
        cursor = page.pageInfo.hasNextPage ? (page.pageInfo.endCursor ?? undefined) : undefined;
      } while (cursor && items.length < RESERVATIONS_HARD_CAP);
      return items.slice(0, RESERVATIONS_HARD_CAP);
    },

    async searchReservations(
      params: ReservationSearchQueryParams
    ): Promise<Page<ReservationSearchHit>> {
      const sp = new URLSearchParams();
      appendStr(sp, "startDate", params.startDate);
      appendStr(sp, "endDate", params.endDate);
      appendList(sp, "municipality", params.municipality);
      appendBool(sp, "isHoliday", params.isHoliday);
      appendBool(sp, "isMorningVacant", params.isMorningVacant);
      appendBool(sp, "isAfternoonVacant", params.isAfternoonVacant);
      appendBool(sp, "isEveningVacant", params.isEveningVacant);
      appendBool(sp, "isAvailableStrings", params.isAvailableStrings);
      appendBool(sp, "isAvailableWoodwind", params.isAvailableWoodwind);
      appendBool(sp, "isAvailableBrass", params.isAvailableBrass);
      appendBool(sp, "isAvailablePercussion", params.isAvailablePercussion);
      appendList(sp, "institutionSizes", params.institutionSizes);
      appendNum(sp, "limit", params.limit);
      appendStr(sp, "cursor", params.cursor);
      return getJson<Page<ReservationSearchHit>>(`/v1/reservations/search?${sp.toString()}`);
    },

    async upsertReservations(req: UpsertReservationsRequest): Promise<UpsertResponse> {
      return putJson<UpsertResponse>("/v1/admin/reservations", req);
    },

    async upsertInstitutions(rows: Institution[]): Promise<UpsertResponse> {
      return putJson<UpsertResponse>("/v1/admin/institutions", { rows });
    },
  };
}
