export { ApolloProvider } from "@apollo/client";
import { ApolloClient, InMemoryCache } from "@apollo/client";
import { SHISETSU_GRAPHQL_ENDPOINT } from "../constants/env";

export const apolloClient = (token: string) =>
  new ApolloClient({
    uri: SHISETSU_GRAPHQL_ENDPOINT,
    cache: new InMemoryCache(),
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
