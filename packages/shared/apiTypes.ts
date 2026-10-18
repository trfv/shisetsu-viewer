import type { Institution } from "./types.ts";

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface Page<T> {
  items: T[];
  pageInfo: PageInfo;
}

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

export type InstitutionDetail = Institution & { updated_at: string };

/** updated_at は取得時刻ではなく最終変化時刻（取得時刻は ScrapeRun） */
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

export interface ReservationSearchHit {
  reservation: ReservationDto;
  institution: Pick<
    Institution,
    "id" | "municipality" | "building" | "institution" | "institution_size" | "division_labels"
  >;
}

/** 導出値と JOIN 結果を持たない。parity 突合は institution_id / date / reservation しか見ない */
export interface ReservationExportRow {
  institution_id: string;
  date: string; // YYYY-MM-DD
  reservation: Record<string, string>;
}

export interface ScrapeRun {
  municipality: string; // MUNICIPALITY_*
  fetched_at: string; // ISO 8601
}

/** is_holiday / 空き 3 フラグは送らない（前者はクエリ時導出、後者は D1 の生成列） */
export interface UpsertReservationsRequest {
  municipality: string; // MUNICIPALITY_*
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

// exactOptionalPropertyTypes 下でパーサの `T | undefined` をそのまま渡せるよう、明示的に `| undefined`
export interface InstitutionsQueryParams {
  municipality?: string[] | undefined;
  isAvailableStrings?: boolean | undefined;
  isAvailableWoodwind?: boolean | undefined;
  isAvailableBrass?: boolean | undefined;
  isAvailablePercussion?: boolean | undefined;
  institutionSizes?: string[] | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
  /** true なら全列（InstitutionDetail）を返す */
  detail?: boolean | undefined;
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
