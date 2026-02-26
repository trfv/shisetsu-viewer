/**
 * Mock data factories for GraphQL responses.
 * Generates Relay-style connection objects matching the actual Hasura schema.
 */

// --- Institution (list query) ---

export const createMockInstitutionNode = (
  overrides?: Record<string, unknown>
): Record<string, unknown> => ({
  __typename: "institutions",
  id: btoa(JSON.stringify([1, "public", "institutions", "b3ed861c-c057-4b71-8678-93b7fea06202"])),
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

export const createMockInstitutionsConnection = (
  nodes: Record<string, unknown>[],
  hasNextPage = false
) => ({
  data: {
    institutions_connection: {
      __typename: "institutionsConnection",
      edges: nodes.map((node, i) => ({
        __typename: "institutionsEdge",
        cursor: btoa(`cursor-${i}`),
        node,
      })),
      pageInfo: {
        __typename: "PageInfo",
        hasNextPage,
        endCursor: nodes.length > 0 ? btoa(`cursor-${nodes.length - 1}`) : "",
      },
    },
  },
});

// --- Institution Detail ---

export const createMockInstitutionDetailNode = (
  overrides?: Record<string, unknown>
): Record<string, unknown> => ({
  __typename: "institutions",
  id: btoa(JSON.stringify([1, "public", "institutions", "b3ed861c-c057-4b71-8678-93b7fea06202"])),
  prefecture: "PREFECTURE_TOKYO",
  municipality: "MUNICIPALITY_KOUTOU",
  building: "テスト文化センター",
  institution: "音楽練習室A",
  capacity: 30,
  area: "65.5",
  fee_divisions: ["FEE_DIVISION_MORNING", "FEE_DIVISION_AFTERNOON", "FEE_DIVISION_EVENING"],
  weekday_usage_fee: [
    { division: "FEE_DIVISION_MORNING", fee: "1000" },
    { division: "FEE_DIVISION_AFTERNOON", fee: "1500" },
  ],
  holiday_usage_fee: [
    { division: "FEE_DIVISION_MORNING", fee: "1200" },
    { division: "FEE_DIVISION_AFTERNOON", fee: "1800" },
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
  ...overrides,
});

export const createMockInstitutionDetailConnection = (node: Record<string, unknown>) => ({
  data: {
    institutions_connection: {
      __typename: "institutionsConnection",
      edges: [{ __typename: "institutionsEdge", node }],
    },
  },
});

// --- Reservation (for institution detail's reservation tab) ---

export const createMockReservationNode = (
  overrides?: Record<string, unknown>
): Record<string, unknown> => ({
  __typename: "reservations",
  id: "reservation-1",
  date: "2024-10-01",
  reservation: {
    RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_VACANT",
    RESERVATION_DIVISION_AFTERNOON: "RESERVATION_STATUS_STATUS_1",
    RESERVATION_DIVISION_EVENING: "RESERVATION_STATUS_VACANT",
  },
  updated_at: "2024-09-30T12:00:00",
  ...overrides,
});

export const createMockInstitutionReservationsConnection = (nodes: Record<string, unknown>[]) => ({
  data: {
    reservations_connection: {
      __typename: "reservationsConnection",
      edges: nodes.map((node) => ({
        __typename: "reservationsEdge",
        node,
      })),
    },
  },
});

// --- Searchable Reservations (reservation search page) ---

export const createMockSearchableReservationNode = (
  overrides?: Record<string, unknown>
): Record<string, unknown> => ({
  __typename: "searchable_reservations",
  id: "searchable-reservation-1",
  reservation: {
    __typename: "reservations",
    id: "reservation-1",
    date: "2024-10-01",
    reservation: {
      RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_VACANT",
      RESERVATION_DIVISION_AFTERNOON: "RESERVATION_STATUS_STATUS_1",
    },
    updated_at: "2024-09-30T12:00:00",
  },
  institution: {
    __typename: "institutions",
    id: btoa(JSON.stringify([1, "public", "institutions", "b3ed861c-c057-4b71-8678-93b7fea06202"])),
    municipality: "MUNICIPALITY_KOUTOU",
    building: "テスト文化センター",
    institution: "音楽練習室A",
    institution_size: "INSTITUTION_SIZE_MEDIUM",
  },
  ...overrides,
});

export const createMockSearchableReservationsConnection = (
  nodes: Record<string, unknown>[],
  hasNextPage = false
) => ({
  data: {
    searchable_reservations_connection: {
      __typename: "searchable_reservationsConnection",
      edges: nodes.map((node, i) => ({
        __typename: "searchable_reservationsEdge",
        cursor: btoa(`cursor-${i}`),
        node,
      })),
      pageInfo: {
        __typename: "PageInfo",
        hasNextPage,
        endCursor: nodes.length > 0 ? btoa(`cursor-${nodes.length - 1}`) : "",
      },
    },
  },
});
