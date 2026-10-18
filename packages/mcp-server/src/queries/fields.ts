import type {
  InstitutionDetail,
  InstitutionSummary,
  ReservationDto,
  ReservationSearchHit,
} from "@shisetsu-viewer/shared";

// DTO のキーに縛る。pick は DTO に無いキーを黙って落とすため、縛らないと DTO とのズレに気づけない。

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

export const RESERVATION_FIELDS = [
  "date",
  "reservation",
  "updated_at",
] as const satisfies readonly (keyof ReservationDto)[];

export const SEARCH_INSTITUTION_FIELDS = [
  "id",
  "municipality",
  "building",
  "institution",
  "institution_size",
] as const satisfies readonly (keyof ReservationSearchHit["institution"])[];
