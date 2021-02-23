import { ApolloProvider } from "@apollo/client";
import { BrowserRouter, Redirect, Route, Switch } from "react-router-dom";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { ErrorBoundary } from "./components/utils/ErrorBoundary";
import { ScrollToTop } from "./components/utils/ScrollToTop";
import { ROUTES } from "./constants/routes";
import { Institution } from "./pages/Institution";
import { InstitutionDetail } from "./pages/InstitutionDetail";
import { Reservation } from "./pages/Reservation";
import { apolloClient } from "./utils/client";
import "./utils/i18n";

const App = () => {
  return (
    <ApolloProvider client={apolloClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <ScrollToTop />
          <Header />
          <Switch>
            <Route path={ROUTES.reservation} component={Reservation} exact />
            <Route path={ROUTES.institution} component={Institution} exact />
            <Route path={ROUTES.institutionDetail} component={InstitutionDetail} exact />
            <Redirect to={ROUTES.reservation} />
          </Switch>
          <Footer />
        </BrowserRouter>
      </ErrorBoundary>
    </ApolloProvider>
  );
};

export default App;
