import { ApolloProvider } from "@apollo/client";
import { Auth0Provider } from "@auth0/auth0-react";
import React from "react";
import { BrowserRouter, Redirect, Route, Switch } from "react-router-dom";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { AuthGuardRoute } from "./components/utils/AuthGuardRoute";
import { ErrorBoundary } from "./components/utils/ErrorBoundary";
import { ScrollToTop } from "./components/utils/ScrollToTop";
import { ROUTES } from "./constants/routes";
import { Institution } from "./pages/Institution";
import { InstitutionDetail } from "./pages/InstitutionDetail";
import { Reservation } from "./pages/Reservation";
import { Waiting } from "./pages/Waiting";
import { apolloClient } from "./utils/client";
import "./utils/i18n";

const App = () => {
  return (
    <Auth0Provider
      domain={process.env.REACT_APP_AUTH0_DOMAIN ?? ""}
      clientId={process.env.REACT_APP_AUTH0_CLIENT_ID ?? ""}
    >
      <ApolloProvider client={apolloClient}>
        <ErrorBoundary>
          <BrowserRouter>
            <ScrollToTop />
            <Header />
            <Switch>
              <Route path={ROUTES.waiting} component={Waiting} />
              <AuthGuardRoute path={ROUTES.reservation} component={Reservation} exact />
              <AuthGuardRoute path={ROUTES.institution} component={Institution} exact />
              <AuthGuardRoute path={ROUTES.institutionDetail} component={InstitutionDetail} exact />
              <Route path={ROUTES.root}>
                <Redirect to={ROUTES.reservation} />
              </Route>
            </Switch>
            <Footer />
          </BrowserRouter>
        </ErrorBoundary>
      </ApolloProvider>
    </Auth0Provider>
  );
};

export default App;
