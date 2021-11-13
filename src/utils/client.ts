export { ApolloProvider } from "@apollo/client";
import { ApolloClient, FieldFunctionOptions, InMemoryCache } from "@apollo/client";
import { Institutions, Reservations } from "../api/graphql-client";
import { SHISETSU_GRAPHQL_ENDPOINT } from "../constants/env";

const offsetLimitPagination = <T>() => ({
  merge(existing: T[] | undefined, incoming: T[], options: FieldFunctionOptions) {
    const merged = existing ?? [];
    if (!options.args) {
      throw new Error("args is null");
    }
    if (options.args.offset === 0) {
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

export const apolloClient = (token: string) =>
  new ApolloClient({
    uri: SHISETSU_GRAPHQL_ENDPOINT,
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
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
