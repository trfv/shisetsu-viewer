import { ApolloClient, InMemoryCache } from "@apollo/client";
import { createContext } from "react";
import { TokyoWard } from "../constants/enums";

const koutouClient = new ApolloClient({
  uri: process.env.REACT_APP_KOUTOU_GRAPHQL_ENDPOINT,
  cache: new InMemoryCache(),
});

const bunkyoClient = new ApolloClient({
  uri: process.env.REACT_APP_BUNKYO_GRAPHQL_ENDPOINT,
  cache: new InMemoryCache(),
});

const kitaClient = new ApolloClient({
  uri: process.env.REACT_APP_KITA_GRAPHQL_ENDPOINT,
  cache: new InMemoryCache(),
});

const toshimaClient = new ApolloClient({
  uri: process.env.REACT_APP_TOSHIMA_GRAPHQL_ENDPOINT,
  cache: new InMemoryCache(),
});

export const APPOLO_CLIENTS = {
  koutouClient,
  bunkyoClient,
  kitaClient,
  toshimaClient,
};

export type ClientNamespace = keyof typeof APPOLO_CLIENTS;

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

export const getTokyoWard = (clientNamespace: ClientNamespace): TokyoWard => {
  switch (clientNamespace) {
    case "koutouClient":
      return TokyoWard.KOUTOU;
    case "bunkyoClient":
      return TokyoWard.BUNKYO;
    case "kitaClient":
      return TokyoWard.KITA;
    case "toshimaClient":
      return TokyoWard.TOSHIMA;
    default:
      throw new Error(`unsupported clientNameSpace: ${clientNamespace}`);
  }
};
