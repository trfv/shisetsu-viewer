import gql from "graphql-tag";
// TODO use typed import/export
import * as SearchQuery from "./__generated__/SearchQuery";
export { SearchQuery as SearchQueryType };

// TODO define type for graphql
export const SEARCH_QUERY = gql`
  query SearchQuery($targetDate: date, $contains1: jsonb = "", $contains2: jsonb = "") {
    reservation(
      where: {
        _or: [
          { date: { _eq: $targetDate }, reservation: { _contains: $contains1 } }
          { date: { _eq: $targetDate }, reservation: { _contains: $contains2 } }
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
