import { ApolloClient, InMemoryCache } from "@apollo/client";
import { SHISETSU_GRAPHQL_ENDPOINT } from "../constants/env";

export const apolloClient = new ApolloClient({
  uri: SHISETSU_GRAPHQL_ENDPOINT,
  cache: new InMemoryCache(),
});
