import gql from "graphql-tag";
// TODO use typed import/export
import * as SearchQuery from "./__generated__/SearchQuery";
export { SearchQuery as SearchQueryType };

// TODO define type for graphql
export const SEARCH_QUERY = gql`
  query SearchQuery(
    $startDate: date
    $endDate: date
    $daysOfWeek: [String!] = null
    $reservationStatus1: jsonb = null
    $reservationStatus2: jsonb = null
  ) {
    reservation(
      where: {
        _or: [
          {
            date: { _gte: $startDate, _lte: $endDate }
            day_of_week: { _in: $daysOfWeek }
            reservation: { _contains: $reservationStatus1 }
          }
          {
            date: { _gte: $startDate, _lte: $endDate }
            day_of_week: { _in: $daysOfWeek }
            reservation: { _contains: $reservationStatus2 }
          }
        ]
      }
    ) {
      id
      building
      institution
      date
      reservation
    }
  }
`;
