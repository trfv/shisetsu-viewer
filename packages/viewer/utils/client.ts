export { ApolloProvider as ClientProvider } from "@apollo/client/react";
import { ApolloClient, InMemoryCache, HttpLink, type FieldFunctionOptions } from "@apollo/client";
import type { Institutions, Reservations, Searchable_Reservations } from "../api/gql/graphql";
import { GRAPHQL_ENDPOINT } from "../constants/env";

const offsetLimitPagination = <T>() => ({
  merge(existing: T[] | undefined, incoming: T[], options: FieldFunctionOptions) {
    const merged = existing ?? [];
    if (!options.args) {
      throw new Error("args is null");
    }
    if (options.args["offset"] === 0) {
      return incoming;
    }
    return merged.concat(incoming);
  },
  read(existing: T[] | undefined, options: FieldFunctionOptions) {
    if (!options.args) {
      throw new Error("args is null");
    }
    return existing;
  },
});

export const client = (token: string) => {
  const httpLink = new HttpLink({
    uri: GRAPHQL_ENDPOINT,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            searchable_reservations: offsetLimitPagination<Searchable_Reservations>(),
            reservations: offsetLimitPagination<Reservations>(),
            institutions: offsetLimitPagination<Institutions>(),
          },
        },
      },
    }),
  });
};
