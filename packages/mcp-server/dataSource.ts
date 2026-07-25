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

/**
 * 読み取り 4 ツールが依存するデータアクセス境界。
 * 実装はリクエストごとに生成して createServer に注入する（モジュールスコープに持たせない）。
 * これにより Workers の isolate が await を跨いでも他リクエストの認証状態に差し替わらない。
 */
export interface DataSource {
  listInstitutions(params: InstitutionsQueryParams): Promise<Page<InstitutionSummary>>;
  getInstitutionDetail(id: string): Promise<InstitutionDetail | null>;
  getInstitutionReservations(
    id: string,
    range: { startDate: string; endDate?: string | undefined }
  ): Promise<ReservationDto[]>;
  searchReservations(params: ReservationSearchQueryParams): Promise<Page<ReservationSearchHit>>;
}

/** 書き込みは admin モード（stdio / CLI 経由の X-Admin-Key）のみ。 */
export interface WritableDataSource extends DataSource {
  upsertReservations(req: UpsertReservationsRequest): Promise<UpsertResponse>;
  upsertInstitutions(rows: Institution[]): Promise<UpsertResponse>;
}

/** 1 施設の予約を日付範囲で取得するときの取得上限（旧 GraphQL の first:1000 相当）。 */
export const RESERVATIONS_HARD_CAP = 1000;
