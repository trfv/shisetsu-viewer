import { InMemoryCache } from "apollo-cache-inmemory";
import ApolloClient from "apollo-client";
import { HttpLink } from "apollo-link-http";
import { createContext } from "react";
import { TokyoWard } from "../constants/enums";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const runtimeEnv = require("@mars/heroku-js-runtime-env");

const env = runtimeEnv();

const koutouClient = new ApolloClient({
  link: new HttpLink({
    uri: env.REACT_APP_KOUTOU_GRAPHQL_ENDPOINT,
  }),
  cache: new InMemoryCache(),
});

const bunkyoClient = new ApolloClient({
  link: new HttpLink({
    uri: env.REACT_APP_BUNKYO_GRAPHQL_ENDPOINT,
  }),
  cache: new InMemoryCache(),
});

const kitaClient = new ApolloClient({
  link: new HttpLink({
    uri: env.REACT_APP_KITA_GRAPHQL_ENDPOINT,
  }),
  cache: new InMemoryCache(),
});

const toshimaClient = new ApolloClient({
  link: new HttpLink({
    uri: env.REACT_APP_TOSHIMA_GRAPHQL_ENDPOINT,
  }),
  cache: new InMemoryCache(),
});

export const clients = {
  koutouClient,
  bunkyoClient,
  kitaClient,
  toshimaClient,
};

export type ClientNamespace = keyof typeof clients;

export const ClientContext = createContext<{
  clientNamespace: ClientNamespace;
  toggleClientNamespace: (tokyoWard: TokyoWard) => void;
}>({
  clientNamespace: "koutouClient",
  toggleClientNamespace: () => null,
});

export const getClientNamespace = (tokyoWard: TokyoWard): ClientNamespace => {
  switch (tokyoWard) {
    case TokyoWard.KOUTOU:
      return "koutouClient";
    case TokyoWard.BUNKYO:
      return "bunkyoClient";
    case TokyoWard.KITA:
      return "kitaClient";
    case TokyoWard.TOSHIMA:
      return "toshimaClient";
    default:
      throw new Error(`unsupported tokyo ward: ${tokyoWard}`);
  }
};
