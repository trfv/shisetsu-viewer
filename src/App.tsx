import { ApolloProvider } from "@apollo/react-hooks";
import { InMemoryCache } from "apollo-cache-inmemory";
import ApolloClient from "apollo-client";
import { HttpLink } from "apollo-link-http";
import React, { createContext, FC, useState } from "react";
import { BrowserRouter, Redirect, Route, Switch } from "react-router-dom";
import Institution from "./components/pages/Institution";
import Reservation from "./components/pages/Reservation";
import Footer from "./components/templates/Footer";
import Header from "./components/templates/Header";
import { routePath } from "./constants/routes";

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

const clients = {
  koutouClient,
  bunkyoClient,
};

export type ClientNamespace = keyof typeof clients;

export const ClientContext = createContext<{
  clientNamespace: ClientNamespace;
  toggleClientNamespace: (namespace: ClientNamespace) => void;
}>({
  clientNamespace: "koutouClient",
  toggleClientNamespace: () => null,
});

const App: FC = () => {
  const [clientNamespace, setClientNamespace] = useState<ClientNamespace>("koutouClient");
  const toggleClientNamespace = (namespace: ClientNamespace): void => {
    namespace !== clientNamespace && setClientNamespace(namespace);
  };
  return (
    <ClientContext.Provider value={{ clientNamespace, toggleClientNamespace }}>
      <ApolloProvider client={clients[clientNamespace]}>
        <BrowserRouter>
          <Header />
          <Switch>
            <Route path={routePath.reservation} component={Reservation} exact />
            <Route path={routePath.institution} component={Institution} exact />
            <Redirect to={routePath.reservation} />
          </Switch>
          <Footer />
        </BrowserRouter>
      </ApolloProvider>
    </ClientContext.Provider>
  );
};

export default App;
