/** listInstitutions で取得可能なフィールド */
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
] as const;

/** getInstitutionDetail で取得可能なフィールド */
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
] as const;

/** getInstitutionReservations で取得可能なフィールド */
export const RESERVATION_FIELDS = ["id", "date", "reservation", "updated_at"] as const;

/** searchReservations の予約サブクエリで取得可能なフィールド */
export const SEARCH_RESERVATION_FIELDS = ["id", "date", "reservation", "updated_at"] as const;

/** searchReservations の施設サブクエリで取得可能なフィールド */
export const SEARCH_INSTITUTION_FIELDS = [
  "id",
  "municipality",
  "building",
  "institution",
  "institution_size",
] as const;
