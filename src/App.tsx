import { ApolloProvider } from "@apollo/client";
import { FC } from "react";
import { BrowserRouter, Redirect, Route, Switch } from "react-router-dom";
import Footer from "./components/organisms/Footer";
import Header from "./components/organisms/Header";
import ScrollToTop from "./components/utils/ScrollToTop";
import { routePath } from "./constants/routes";
import Institution from "./pages/Institution";
import InstitutionDetail from "./pages/InstitutionDetail";
import Reservation from "./pages/Reservation";
import { apolloClient } from "./utils/client";
import "./utils/i18n";

const App: FC = () => {
  return (
    <ApolloProvider client={apolloClient}>
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
  );
};

export default App;
