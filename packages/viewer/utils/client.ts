export { ApolloProvider as ClientProvider } from "@apollo/client";
import { ApolloClient, InMemoryCache, type FieldFunctionOptions } from "@apollo/client";
import type { Institutions, Reservations } from "../api/gql/graphql";
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

export const client = (token: string) =>
  new ApolloClient({
    uri: GRAPHQL_ENDPOINT,
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            reservations: offsetLimitPagination<Reservations>(),
            institutions: offsetLimitPagination<Institutions>(),
          },
        },
      },
    }),
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
