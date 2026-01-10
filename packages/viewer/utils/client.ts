export { ApolloProvider as ClientProvider } from "@apollo/client/react";
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import { relayStylePagination } from "@apollo/client/utilities";
import { GRAPHQL_ENDPOINT } from "../constants/env";

export const client = (token: string) => {
  return new ApolloClient({
    link: new HttpLink({
      uri: GRAPHQL_ENDPOINT,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            institutions_connection: relayStylePagination(["where"]),
            searchable_reservations_connection: relayStylePagination(["where"]),
          },
        },
      },
    }),
  });
};
