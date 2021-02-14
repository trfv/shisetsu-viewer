import { ApolloClient, InMemoryCache } from "@apollo/client";

export const apolloClient = new ApolloClient({
  uri: process.env.REACT_APP_SHISETSU_GRAPHQL_ENDPOINT,
  cache: new InMemoryCache(),
});
