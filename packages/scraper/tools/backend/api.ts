import type { Building, InstitutionDetail, Page } from "@shisetsu-viewer/shared";

import type { InstitutionKeyMap, InstitutionRecord, ReservationRow } from "./types.ts";

const CHUNK = 500;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

// OIDC の環境変数は job に `permissions: id-token: write` があるときだけ注入される。
async function getAuthHeaders(): Promise<Record<string, string>> {
  const requestUrl = process.env["ACTIONS_ID_TOKEN_REQUEST_URL"];
  const requestToken = process.env["ACTIONS_ID_TOKEN_REQUEST_TOKEN"];
  if (requestUrl && requestToken) {
    const audience = process.env["OIDC_AUDIENCE"] ?? "https://api.shisetsudb.com";
    const res = await fetch(`${requestUrl}&audience=${encodeURIComponent(audience)}`, {
      headers: { Authorization: `bearer ${requestToken}` },
    });
    if (!res.ok) throw new Error(`OIDC token fetch failed: ${res.status}`);
    const { value } = (await res.json()) as { value: string };
    return { Authorization: `Bearer ${value}` };
  }
  return { "X-Admin-Key": requireEnv("ADMIN_API_KEY") };
}

interface UpsertResponse {
  received: number;
  rowsWritten: number;
  deferred: boolean;
}

async function putJson<T>(path: string, body: unknown): Promise<T> {
  const endpoint = requireEnv("API_ENDPOINT");
  const headers = { "Content-Type": "application/json", ...(await getAuthHeaders()) };
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${endpoint}${path}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });
      if (res.status >= 500) throw new Error(`HTTP error! status: ${res.status}`);
      if (!res.ok && res.status !== 202) {
        throw new Error(`API error ${res.status}: ${await res.text()}`);
      }
      return (await res.json()) as T;
    } catch (error) {
      lastError = error;
      const retryable = error instanceof Error && error.message.startsWith("HTTP error!");
      if (attempt < MAX_RETRIES && retryable) {
        await new Promise((resolve) => setTimeout(resolve, BASE_DELAY_MS * Math.pow(2, attempt)));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

export async function upsertReservations(
  rows: ReservationRow[],
  municipality: string,
  runId: string
): Promise<number> {
  let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const res = await putJson<UpsertResponse>("/v1/admin/reservations", {
      municipality,
      runId,
      rows: chunk,
    });
    written += res.rowsWritten;
    if (res.deferred) {
      console.warn(`d1: daily write budget reached; remaining chunks deferred to next run`);
      break;
    }
    console.log(`d1: ${i + 1} ~ ${i + chunk.length}, rows_written: ${res.rowsWritten}`);
  }
  return written;
}

export async function upsertBuildings(rows: Building[]): Promise<number> {
  const res = await putJson<UpsertResponse>("/v1/admin/buildings", { rows });
  return res.rowsWritten;
}

export async function upsertInstitutions(rows: InstitutionRecord[]): Promise<number> {
  const res = await putJson<UpsertResponse>("/v1/admin/institutions", { rows });
  return res.rowsWritten;
}

// detail=true はエッジキャッシュに載らない。施設 upsert 直後にキーマップを引くのでキャッシュされる経路は使わない。
async function listInstitutions(municipality: string): Promise<InstitutionDetail[]> {
  const endpoint = requireEnv("API_ENDPOINT");
  const all: InstitutionDetail[] = [];
  let cursor: string | null = null;
  do {
    const qs = new URLSearchParams({ municipality, detail: "true", limit: "100" });
    if (cursor) qs.set("cursor", cursor);
    const res = await fetch(`${endpoint}/v1/institutions?${qs.toString()}`);
    if (!res.ok) throw new Error(`D1 institutions error ${res.status}: ${await res.text()}`);
    const page = (await res.json()) as Page<InstitutionDetail>;
    all.push(...page.items);
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
  return all;
}

export async function fetchInstitutionKeyMap(municipality: string): Promise<InstitutionKeyMap> {
  const map: InstitutionKeyMap = {};
  for (const i of await listInstitutions(municipality)) {
    map[`${i.building_system_name}-${i.institution_system_name}`] = i.id;
  }
  return map;
}

// api に建物の読み取り経路がまだ無いので、部屋の写しから建物を組み立て、reservation_system は手元の JSON から引き継ぐ
export async function exportInstitutions(
  municipality: string,
  localBuildings: Building[]
): Promise<{ buildings: Building[]; institutions: InstitutionRecord[] }> {
  const reservationSystems = new Map(localBuildings.map((b) => [b.id, b.reservation_system]));
  const buildings = new Map<string, Building>();
  const institutions: InstitutionRecord[] = [];
  for (const detail of await listInstitutions(municipality)) {
    const {
      id,
      updated_at: _updatedAt,
      building_id: buildingId,
      prefecture,
      municipality: _municipality,
      building,
      building_kana,
      building_system_name,
      address,
      ...room
    } = detail;
    if (!buildingId) throw new Error(`institution ${id} に building_id がありません`);
    if (!buildings.has(buildingId)) {
      buildings.set(buildingId, {
        id: buildingId,
        prefecture,
        municipality: detail.municipality,
        name: building,
        kana: building_kana,
        system_name: building_system_name,
        address,
        reservation_system: reservationSystems.get(buildingId) ?? null,
      });
    }
    institutions.push({ id, building_id: buildingId, ...room });
  }
  return { buildings: [...buildings.values()], institutions };
}
