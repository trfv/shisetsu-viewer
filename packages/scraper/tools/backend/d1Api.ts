import type { Institution } from "@shisetsu-viewer/shared";

import type { ReservationRow } from "./types.ts";

const CHUNK = 500;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/**
 * GitHub Actions では OIDC トークン、ローカルでは ADMIN_API_KEY を使う。
 * OIDC の環境変数は job に `permissions: id-token: write` があるときだけ注入される。
 */
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
  const endpoint = requireEnv("D1_API_ENDPOINT");
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
        throw new Error(`D1 API error ${res.status}: ${await res.text()}`);
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

export async function upsertInstitutions(rows: Institution[]): Promise<number> {
  const res = await putJson<UpsertResponse>("/v1/admin/institutions", { rows });
  return res.rowsWritten;
}

export async function upsertHolidays(rows: { date: string; name: string }[]): Promise<number> {
  const res = await putJson<UpsertResponse>("/v1/admin/holidays", { rows });
  return res.rowsWritten;
}

/** パリティ突合用: D1 の予約を全列 dump（keyset 追跡） */
export async function exportReservations(
  municipality: string
): Promise<{ institution_id: string; date: string; reservation: Record<string, string> }[]> {
  const endpoint = requireEnv("D1_API_ENDPOINT");
  const headers = await getAuthHeaders();
  const all: { institution_id: string; date: string; reservation: Record<string, string> }[] = [];
  let cursor: string | null = null;
  do {
    const qs = new URLSearchParams({ municipality, limit: "1000" });
    if (cursor) qs.set("cursor", cursor);
    const res = await fetch(`${endpoint}/v1/admin/reservations/export?${qs.toString()}`, {
      headers,
    });
    if (!res.ok) throw new Error(`D1 export error ${res.status}: ${await res.text()}`);
    const page = (await res.json()) as {
      items: {
        reservation: { institution_id: string; date: string; reservation: Record<string, string> };
      }[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
    for (const hit of page.items) {
      all.push({
        institution_id: hit.reservation.institution_id,
        date: hit.reservation.date,
        reservation: hit.reservation.reservation,
      });
    }
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
  return all;
}
