/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL query operation: SearchQuery
// ====================================================

export interface SearchQuery_reservation {
  __typename: "reservation";
  id: number;
  building: string;
  institution: string;
  date: any;
  reservation: any;
}

export interface SearchQuery_reservation_aggregate_aggregate {
  __typename: "reservation_aggregate_fields";
  count: number | null;
}

export interface SearchQuery_reservation_aggregate {
  __typename: "reservation_aggregate";
  aggregate: SearchQuery_reservation_aggregate_aggregate | null;
}

export interface SearchQuery {
  /**
   * fetch data from the table: "reservation"
   */
  reservation: SearchQuery_reservation[];
  /**
   * fetch aggregated fields from the table: "reservation"
   */
  reservation_aggregate: SearchQuery_reservation_aggregate;
}

export interface SearchQueryVariables {
  offset?: number | null;
  limit?: number | null;
  startDate?: any | null;
  endDate?: any | null;
  daysOfWeek?: string[] | null;
  reservationStatus1?: any | null;
  reservationStatus2?: any | null;
}
