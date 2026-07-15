import type { Institution } from "@shisetsu-viewer/shared";

/**
 * test-results/<municipality>/*.json の 1 ファイル分。スクレイパー出力とアップロードの境界契約。
 * キー対応: facility_name ↔ institutions.building_system_name、
 *           data[].room_name ↔ institutions.institution_system_name
 */
export interface FileData {
  facility_name: string;
  data: { room_name: string; date: string; reservation: Record<string, string> }[];
}

/** reservations upsert の 1 行 */
export interface ReservationRow {
  institution_id: string;
  date: string; // YYYY-MM-DD
  reservation: Record<string, string>;
}

/** `${building_system_name}-${institution_system_name}` → institutions.id */
export type InstitutionKeyMap = Record<string, string>;

/** 予約データの書き込み先バックエンド（Hasura 実装 → PR 3-2 で D1 実装が並ぶ） */
export interface ReservationBackend {
  fetchInstitutionKeyMap(prefecture: string, municipality: string): Promise<InstitutionKeyMap>;
  /** 戻り値は書き込み行数（affected_rows 相当） */
  upsertReservations(rows: ReservationRow[]): Promise<number>;
}

export interface InstitutionBackend {
  upsertInstitutions(rows: Institution[]): Promise<number>;
  listInstitutions(prefecture: string, municipality: string): Promise<Institution[]>;
}
