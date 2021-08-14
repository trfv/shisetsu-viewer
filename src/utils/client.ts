import { ApolloClient, InMemoryCache } from "@apollo/client";

export const apolloClient = new ApolloClient({
  uri: import.meta.env.VITE_SHISETSU_GRAPHQL_ENDPOINT as string,
  cache: new InMemoryCache(),
});
