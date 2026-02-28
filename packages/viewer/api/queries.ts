// Hand-written query strings and response types extracted from
// the auto-generated api/gql/graphql.ts and api/queries/*.graphql.
// These replace the codegen-generated typed documents.

// ─── Query variable types ────────────────────────────────────

export type InstitutionsQueryVariables = {
  first?: number | null;
  after?: string | null;
  municipality?: string[] | string | null;
  isAvailableStrings?: string | null;
  isAvailableWoodwind?: string | null;
  isAvailableBrass?: string | null;
  isAvailablePercussion?: string | null;
  institutionSizes?: string[] | string | null;
};

export type ReservationsQueryVariables = {
  first?: number | null;
  after?: string | null;
  prefecture?: string | null;
  municipality?: string[] | string | null;
  isAvailableStrings?: string | null;
  isAvailableWoodwind?: string | null;
  isAvailableBrass?: string | null;
  isAvailablePercussion?: string | null;
  institutionSizes?: string[] | string | null;
  startDate?: string | null;
  endDate?: string | null;
  isHoliday?: boolean | null;
  isMorningVacant?: boolean | null;
  isAfternoonVacant?: boolean | null;
  isEveningVacant?: boolean | null;
};

// ─── Institutions (list page) ─────────────────────────────────

export const INSTITUTIONS_QUERY = `
query institutions(
  $first: Int
  $after: String
  $municipality: [String!]
  $isAvailableStrings: availavility_division = null
  $isAvailableWoodwind: availavility_division = null
  $isAvailableBrass: availavility_division = null
  $isAvailablePercussion: availavility_division = null
  $institutionSizes: [String!] = null
) {
  institutions_connection(
    first: $first
    after: $after
    where: {
      municipality: { _in: $municipality }
      is_available_strings: { _eq: $isAvailableStrings }
      is_available_woodwind: { _eq: $isAvailableWoodwind }
      is_available_brass: { _eq: $isAvailableBrass }
      is_available_percussion: { _eq: $isAvailablePercussion }
      institution_size: { _in: $institutionSizes }
    }
    order_by: { municipality: asc, building_kana: asc, institution_kana: asc }
  ) {
    edges {
      node {
        id
        municipality
        building
        institution
        institution_size
        is_available_strings
        is_available_woodwind
        is_available_brass
        is_available_percussion
        is_equipped_music_stand
        is_equipped_piano
        updated_at
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;

export type InstitutionNode = {
  id: string;
  municipality: string;
  building: string;
  institution: string;
  institution_size: string;
  is_available_strings: string;
  is_available_woodwind: string;
  is_available_brass: string;
  is_available_percussion: string;
  is_equipped_music_stand: string;
  is_equipped_piano: string;
  updated_at?: string | null;
};

export type InstitutionsQueryData = {
  institutions_connection: {
    edges: Array<{ node: InstitutionNode; cursor: string }>;
    pageInfo: { hasNextPage: boolean; endCursor: string };
  };
};

// ─── Institution Detail ───────────────────────────────────────

export const INSTITUTION_DETAIL_QUERY = `
query institutionDetail($id: uuid!) {
  institutions_connection(where: { id: { _eq: $id } }, first: 1) {
    edges {
      node {
        id
        prefecture
        municipality
        building
        institution
        capacity
        area
        fee_divisions
        weekday_usage_fee
        holiday_usage_fee
        address
        is_available_strings
        is_available_woodwind
        is_available_brass
        is_available_percussion
        is_equipped_music_stand
        is_equipped_piano
        website_url
        layout_image_url
        lottery_period
        note
      }
    }
  }
}`;

export type InstitutionDetailNode = {
  id: string;
  prefecture: string;
  municipality: string;
  building: string;
  institution: string;
  capacity?: number | null;
  area?: number | null;
  fee_divisions: string[];
  weekday_usage_fee: Record<string, unknown>;
  holiday_usage_fee: Record<string, unknown>;
  address: string;
  is_available_strings: string;
  is_available_woodwind: string;
  is_available_brass: string;
  is_available_percussion: string;
  is_equipped_music_stand: string;
  is_equipped_piano: string;
  website_url: string;
  layout_image_url: string;
  lottery_period: string;
  note: string;
};

export type InstitutionDetailQueryData = {
  institutions_connection: {
    edges: Array<{ node: InstitutionDetailNode }>;
  };
};

// ─── Institution Reservations ─────────────────────────────────

export const INSTITUTION_RESERVATIONS_QUERY = `
query institutionReservations($id: uuid!, $startDate: date, $endDate: date) {
  reservations_connection(
    where: { institution_id: { _eq: $id }, date: { _gte: $startDate, _lte: $endDate } }
    order_by: { date: asc }
    first: 1000
  ) {
    edges {
      node {
        id
        date
        reservation
        updated_at
      }
    }
  }
}`;

export type ReservationNode = {
  id: string;
  date: string;
  reservation: Record<string, string>;
  updated_at: string;
};

export type InstitutionReservationsQueryData = {
  reservations_connection: {
    edges: Array<{ node: ReservationNode }>;
  };
};

// ─── Searchable Reservations (search page) ────────────────────

export const RESERVATIONS_QUERY = `
query reservations(
  $first: Int
  $after: String
  $prefecture: prefecture = null
  $municipality: [String!]
  $isAvailableStrings: availavility_division = null
  $isAvailableWoodwind: availavility_division = null
  $isAvailableBrass: availavility_division = null
  $isAvailablePercussion: availavility_division = null
  $institutionSizes: [String!] = null
  $startDate: date
  $endDate: date
  $isHoliday: Boolean
  $isMorningVacant: Boolean
  $isAfternoonVacant: Boolean
  $isEveningVacant: Boolean
) {
  searchable_reservations_connection(
    first: $first
    after: $after
    where: {
      _and: {
        institution: {
          prefecture: { _eq: $prefecture }
          municipality: { _in: $municipality }
          is_available_strings: { _eq: $isAvailableStrings }
          is_available_woodwind: { _eq: $isAvailableWoodwind }
          is_available_brass: { _eq: $isAvailableBrass }
          is_available_percussion: { _eq: $isAvailablePercussion }
          institution_size: { _in: $institutionSizes }
        }
        date: { _gte: $startDate, _lte: $endDate }
        is_morning_vacant: { _eq: $isMorningVacant }
        is_afternoon_vacant: { _eq: $isAfternoonVacant }
        is_evening_vacant: { _eq: $isEveningVacant }
        is_holiday: { _eq: $isHoliday }
      }
    }
    order_by: { date: asc }
  ) {
    edges {
      node {
        id
        reservation {
          id
          date
          reservation
          updated_at
        }
        institution {
          id
          municipality
          building
          institution
          institution_size
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;

export type SearchableReservationNode = {
  id: string;
  reservation?: {
    id: string;
    date: string;
    reservation: Record<string, string>;
    updated_at: string;
  } | null;
  institution?: {
    id: string;
    municipality: string;
    building: string;
    institution: string;
    institution_size: string;
  } | null;
};

export type ReservationsQueryData = {
  searchable_reservations_connection: {
    edges: Array<{ node: SearchableReservationNode; cursor: string }>;
    pageInfo: { hasNextPage: boolean; endCursor: string };
  };
};
