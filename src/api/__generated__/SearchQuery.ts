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

export interface SearchQuery {
  /**
   * fetch data from the table: "reservation"
   */
  reservation: SearchQuery_reservation[];
}

export interface SearchQueryVariables {
  targetDate?: any | null;
  contains1?: any | null;
  contains2?: any | null;
}
