import type {
  InstitutionDetail,
  InstitutionSummary,
  ReservationDto,
  ReservationSearchHit,
} from "@shisetsu-viewer/shared";

/**
 * `fields` で選べるフィールド。API の DTO のキーに縛り、DTO から消えたキーを型で検出する
 * （pick は DTO に無いキーを黙って落とすため、ここで縛らないとズレに気づけない）。
 */

/** list_institutions で取得可能なフィールド */
export const INSTITUTION_LIST_FIELDS = [
  "id",
  "municipality",
  "building",
  "institution",
  "institution_size",
  "is_available_strings",
  "is_available_woodwind",
  "is_available_brass",
  "is_available_percussion",
  "is_equipped_music_stand",
  "is_equipped_piano",
  "updated_at",
] as const satisfies readonly (keyof InstitutionSummary)[];

/** get_institution_detail で取得可能なフィールド */
export const INSTITUTION_DETAIL_FIELDS = [
  "id",
  "prefecture",
  "municipality",
  "building",
  "institution",
  "capacity",
  "area",
  "fee_divisions",
  "weekday_usage_fee",
  "holiday_usage_fee",
  "address",
  "is_available_strings",
  "is_available_woodwind",
  "is_available_brass",
  "is_available_percussion",
  "is_equipped_music_stand",
  "is_equipped_piano",
  "website_url",
  "layout_image_url",
  "lottery_period",
  "note",
] as const satisfies readonly (keyof InstitutionDetail)[];

/** get_institution_reservations と search_reservations の予約で取得可能なフィールド */
export const RESERVATION_FIELDS = [
  "date",
  "reservation",
  "updated_at",
] as const satisfies readonly (keyof ReservationDto)[];

/** search_reservations の施設で取得可能なフィールド */
export const SEARCH_INSTITUTION_FIELDS = [
  "id",
  "municipality",
  "building",
  "institution",
  "institution_size",
] as const satisfies readonly (keyof ReservationSearchHit["institution"])[];
