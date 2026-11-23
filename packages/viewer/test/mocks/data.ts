import type {
  BuildingDetail,
  InstitutionDetail,
  InstitutionSummary,
  Page,
  ReservationDto,
  ReservationSearchHit,
} from "@shisetsu-viewer/shared";

export const MOCK_BUILDING_ID = "5d8f2a1e-3c4b-4e6f-9a7b-1c2d3e4f5a6b";

export const createMockInstitutionSummary = (
  overrides?: Partial<InstitutionSummary>
): InstitutionSummary => ({
  id: "b3ed861c-c057-4b71-8678-93b7fea06202",
  building_id: MOCK_BUILDING_ID,
  municipality: "MUNICIPALITY_KOUTOU",
  building: "テスト文化センター",
  institution: "音楽練習室A",
  institution_size: "INSTITUTION_SIZE_MEDIUM",
  is_available_strings: "AVAILABILITY_DIVISION_AVAILABLE",
  is_available_woodwind: "AVAILABILITY_DIVISION_AVAILABLE",
  is_available_brass: "AVAILABILITY_DIVISION_UNAVAILABLE",
  is_available_percussion: "AVAILABILITY_DIVISION_UNKNOWN",
  is_equipped_music_stand: "EQUIPMENT_DIVISION_EQUIPPED",
  is_equipped_piano: "EQUIPMENT_DIVISION_UNEQUIPPED",
  updated_at: "2024-09-25T00:00:00",
  ...overrides,
});

export const createMockInstitutionsPage = (
  items: InstitutionSummary[],
  hasNextPage = false
): Page<InstitutionSummary> => ({
  items,
  pageInfo: {
    hasNextPage,
    endCursor: items.length > 0 ? `cursor-${items.length - 1}` : null,
  },
});

export const createMockInstitutionDetail = (
  overrides?: Partial<InstitutionDetail>
): InstitutionDetail => ({
  id: "b3ed861c-c057-4b71-8678-93b7fea06202",
  building_id: MOCK_BUILDING_ID,
  prefecture: "PREFECTURE_TOKYO",
  municipality: "MUNICIPALITY_KOUTOU",
  building: "テスト文化センター",
  institution: "音楽練習室A",
  building_kana: "テストブンカセンター",
  institution_kana: "オンガクレンシュウシツエー",
  building_system_name: "test-center",
  institution_system_name: "music-a",
  capacity: 30,
  area: 65.5,
  institution_size: "INSTITUTION_SIZE_MEDIUM",
  reservation_system: "tokyo-koutou",
  fee_divisions: ["FEE_DIVISION_MORNING", "FEE_DIVISION_AFTERNOON", "FEE_DIVISION_EVENING"],
  weekday_usage_fee: [
    { division: "FEE_DIVISION_MORNING", fee: 1000 },
    { division: "FEE_DIVISION_AFTERNOON", fee: 1500 },
  ],
  holiday_usage_fee: [
    { division: "FEE_DIVISION_MORNING", fee: 1200 },
    { division: "FEE_DIVISION_AFTERNOON", fee: 1800 },
  ],
  address: "東京都江東区東陽1-1-1",
  is_available_strings: "AVAILABILITY_DIVISION_AVAILABLE",
  is_available_woodwind: "AVAILABILITY_DIVISION_AVAILABLE",
  is_available_brass: "AVAILABILITY_DIVISION_UNAVAILABLE",
  is_available_percussion: "AVAILABILITY_DIVISION_UNKNOWN",
  is_equipped_music_stand: "EQUIPMENT_DIVISION_EQUIPPED",
  is_equipped_piano: "EQUIPMENT_DIVISION_UNEQUIPPED",
  website_url: "",
  layout_image_url: "",
  lottery_period: "利用月の2ヶ月前",
  note: "テスト備考",
  updated_at: "2024-09-25T00:00:00",
  ...overrides,
});

export const createMockBuildingDetail = (overrides?: Partial<BuildingDetail>): BuildingDetail => ({
  id: MOCK_BUILDING_ID,
  prefecture: "PREFECTURE_TOKYO",
  municipality: "MUNICIPALITY_KOUTOU",
  name: "テスト文化センター",
  kana: "テストブンカセンター",
  system_name: "test-center",
  address: "東京都江東区東陽1-1-1",
  reservation_system: "tokyo-koutou",
  updated_at: "2024-09-25T00:00:00",
  institutions: [createMockInstitutionSummary()],
  ...overrides,
});

export const createMockReservationDto = (overrides?: Partial<ReservationDto>): ReservationDto => ({
  institution_id: "b3ed861c-c057-4b71-8678-93b7fea06202",
  date: "2024-10-01",
  reservation: {
    RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_VACANT",
    RESERVATION_DIVISION_AFTERNOON: "RESERVATION_STATUS_STATUS_1",
    RESERVATION_DIVISION_EVENING: "RESERVATION_STATUS_VACANT",
  },
  is_holiday: false,
  is_morning_vacant: true,
  is_afternoon_vacant: false,
  is_evening_vacant: true,
  is_morning_newly_vacant: false,
  is_afternoon_newly_vacant: false,
  is_evening_newly_vacant: false,
  updated_at: "2024-09-30T12:00:00",
  ...overrides,
});

export const createMockReservationsPage = (
  items: ReservationDto[],
  hasNextPage = false
): Page<ReservationDto> => ({
  items,
  pageInfo: {
    hasNextPage,
    endCursor: items.length > 0 ? `cursor-${items.length - 1}` : null,
  },
});

export const createMockReservationSearchHit = (
  overrides?: Partial<ReservationSearchHit>
): ReservationSearchHit => ({
  reservation: createMockReservationDto({
    reservation: {
      RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_VACANT",
      RESERVATION_DIVISION_AFTERNOON: "RESERVATION_STATUS_STATUS_1",
    },
  }),
  institution: {
    id: "b3ed861c-c057-4b71-8678-93b7fea06202",
    building_id: MOCK_BUILDING_ID,
    municipality: "MUNICIPALITY_KOUTOU",
    building: "テスト文化センター",
    institution: "音楽練習室A",
    institution_size: "INSTITUTION_SIZE_MEDIUM",
    reservation_system: "tokyo-koutou",
  },
  ...overrides,
});

export const createMockReservationSearchPage = (
  items: ReservationSearchHit[],
  hasNextPage = false
): Page<ReservationSearchHit> => ({
  items,
  pageInfo: {
    hasNextPage,
    endCursor: items.length > 0 ? `cursor-${items.length - 1}` : null,
  },
});
