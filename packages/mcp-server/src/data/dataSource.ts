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

// 実装はリクエストごとに生成して注入する。モジュールスコープに置くと、Workers の isolate が
// await を跨いで並行リクエストの認証状態に差し替える。
export interface DataSource {
  listInstitutions(params: InstitutionsQueryParams): Promise<Page<InstitutionSummary>>;
  getInstitutionDetail(id: string): Promise<InstitutionDetail | null>;
  getInstitutionReservations(
    id: string,
    range: { startDate: string; endDate?: string | undefined }
  ): Promise<ReservationDto[]>;
  searchReservations(params: ReservationSearchQueryParams): Promise<Page<ReservationSearchHit>>;
}

export interface WritableDataSource extends DataSource {
  upsertReservations(req: UpsertReservationsRequest): Promise<UpsertResponse>;
  upsertInstitutions(rows: Institution[]): Promise<UpsertResponse>;
}

export const RESERVATIONS_HARD_CAP = 1000;
