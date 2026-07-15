import type { Institution } from "./types.ts";

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface Page<T> {
  items: T[];
  pageInfo: PageInfo;
}

/** GET /v1/institutions の 1 行（viewer 一覧 + mcp list_institutions が使用） */
export type InstitutionSummary = Pick<
  Institution,
  | "id"
  | "municipality"
  | "building"
  | "institution"
  | "institution_size"
  | "is_available_strings"
  | "is_available_woodwind"
  | "is_available_brass"
  | "is_available_percussion"
  | "is_equipped_music_stand"
  | "is_equipped_piano"
> & { updated_at: string };

/** GET /v1/institutions/:id（全 25 列 + updated_at） */
export type InstitutionDetail = Institution & { updated_at: string };

/** 予約 1 行。
 * - updated_at は「最終変化時刻」（差分書き込みのため。取得時刻は ScrapeRun 参照）
 * - is_holiday / is_*_vacant は DB の列ではなく **クエリ時に導出**した値
 */
export interface ReservationDto {
  institution_id: string;
  date: string; // YYYY-MM-DD
  reservation: Record<string, string>;
  is_holiday: boolean;
  is_morning_vacant: boolean;
  is_afternoon_vacant: boolean;
  is_evening_vacant: boolean;
  updated_at: string;
}

/** GET /v1/reservations/search の 1 ヒット */
export interface ReservationSearchHit {
  reservation: ReservationDto;
  institution: Pick<
    Institution,
    "id" | "municipality" | "building" | "institution" | "institution_size"
  >;
}

/** GET /v1/scrape-runs の 1 行（自治体別最新） */
export interface ScrapeRun {
  municipality: string; // MUNICIPALITY_*
  fetched_at: string; // ISO 8601
}

/**
 * PUT /v1/admin/reservations のリクエスト。
 * is_holiday / 空き 3 フラグは送らない（前者はクエリ時導出、後者は D1 の生成列が自動計算）。
 */
export interface UpsertReservationsRequest {
  municipality: string; // MUNICIPALITY_*（scrape_runs 記録用）
  runId: string; // GitHub run id またはローカル実行のタイムスタンプ
  rows: {
    institution_id: string;
    date: string;
    reservation: Record<string, string>;
  }[];
}

export interface UpsertResponse {
  received: number;
  rowsWritten: number;
  deferred: boolean;
}

// 以下 2 つは URL クエリ由来の「不在または値」の入力。exactOptionalPropertyTypes 下で
// パーサの `T | undefined` をそのまま渡せるよう、任意フィールドは明示的に `| undefined`。
export interface InstitutionsQueryParams {
  municipality?: string[] | undefined;
  isAvailableStrings?: boolean | undefined;
  isAvailableWoodwind?: boolean | undefined;
  isAvailableBrass?: boolean | undefined;
  isAvailablePercussion?: boolean | undefined;
  institutionSizes?: string[] | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
}

export interface ReservationSearchQueryParams {
  municipality?: string[] | undefined;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  isHoliday?: boolean | undefined;
  isMorningVacant?: boolean | undefined;
  isAfternoonVacant?: boolean | undefined;
  isEveningVacant?: boolean | undefined;
  isAvailableStrings?: boolean | undefined;
  isAvailableWoodwind?: boolean | undefined;
  isAvailableBrass?: boolean | undefined;
  isAvailablePercussion?: boolean | undefined;
  institutionSizes?: string[] | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
}
