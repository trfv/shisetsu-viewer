import { ApolloProvider } from "@apollo/react-hooks";
import React, { FC, useState } from "react";
import { BrowserRouter, Redirect, Route, Switch } from "react-router-dom";
import Institution from "./components/pages/Institution";
import Reservation from "./components/pages/Reservation";
import Footer from "./components/templates/Footer";
import Header from "./components/templates/Header";
import { TokyoWard } from "./constants/enums";
import { routePath } from "./constants/routes";
import { ClientContext, ClientNamespace, clients, getClientNamespace } from "./utils/client";
import "./utils/i18n";

const App: FC = () => {
  const [clientNamespace, setClientNamespace] = useState<ClientNamespace>("koutouClient");
  const toggleClientNamespace = (tokyoWard: TokyoWard): void => {
    const namespace = getClientNamespace(tokyoWard);
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
