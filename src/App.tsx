import { ApolloProvider } from "@apollo/client";
import { FC, useState } from "react";
import { BrowserRouter, Redirect, Route, Switch } from "react-router-dom";
import Footer from "./components/organisms/Footer";
import Header from "./components/organisms/Header";
import ScrollToTop from "./components/utils/ScrollToTop";
import { TokyoWard } from "./constants/enums";
import { routePath } from "./constants/routes";
import Institution from "./pages/Institution";
import InstitutionDetail from "./pages/InstitutionDetail";
import Reservation from "./pages/Reservation";
import { APPOLO_CLIENTS, ClientContext, ClientNamespace, getClientNamespace } from "./utils/client";
import "./utils/i18n";

const App: FC = () => {
  const [clientNamespace, setClientNamespace] = useState<ClientNamespace>("koutouClient");
  const toggleClientNamespace = (tokyoWard: TokyoWard): void => {
    const namespace = getClientNamespace(tokyoWard);
    namespace !== clientNamespace && setClientNamespace(namespace);
  };
  return (
    <ClientContext.Provider value={{ clientNamespace, toggleClientNamespace }}>
      <ApolloProvider client={APPOLO_CLIENTS[clientNamespace]}>
        <BrowserRouter>
          <ScrollToTop />
          <Header />
          <Switch>
            <Route path={routePath.reservation} component={Reservation} exact />
            <Route path={routePath.institution} component={Institution} exact />
            <Route path={routePath.institutionDetail} component={InstitutionDetail} exact />
            <Redirect to={routePath.reservation} />
          </Switch>
          <Footer />
        </BrowserRouter>
      </ApolloProvider>
    </ClientContext.Provider>
  );
};

export default App;
