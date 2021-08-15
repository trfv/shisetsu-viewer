import { ApolloProvider } from "@apollo/client";
import { Auth0Provider } from "@auth0/auth0-react";
import { CssBaseline } from "@material-ui/core";
import { ThemeProvider } from "@material-ui/core/styles";
import { lazy, Suspense } from "react";
import { BrowserRouter, Redirect, Route, Switch } from "react-router-dom";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { AuthGuardRoute } from "./components/utils/AuthGuardRoute";
import { ErrorBoundary } from "./components/utils/ErrorBoundary";
import { ScrollToTop } from "./components/utils/ScrollToTop";
import { ROUTES } from "./constants/routes";
import { Loading } from "./pages/Loading";
import { Waiting } from "./pages/Waiting";
import { apolloClient } from "./utils/client";
import { lightTheme as theme } from "./utils/theme";

const Institution = lazy(() => import("./pages/Institution"));
const InstitutionDetail = lazy(() => import("./pages/InstitutionDetail"));
const Reservation = lazy(() => import("./pages/Reservation"));

const App = () => {
  // const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  // const theme = useMemo(() => (prefersDarkMode ? darkTheme : lightTheme), [prefersDarkMode]);

  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN as string}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID as string}
    >
      <ApolloProvider client={apolloClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ErrorBoundary>
            <BrowserRouter>
              <ScrollToTop />
              <Header />
              <Suspense fallback={Loading}>
                <Switch>
                  <Route path={ROUTES.waiting} component={Waiting} />
                  <AuthGuardRoute path={ROUTES.reservation} component={Reservation} exact />
                  <AuthGuardRoute path={ROUTES.institution} component={Institution} exact />
                  <AuthGuardRoute
                    path={ROUTES.institutionDetail}
                    component={InstitutionDetail}
                    exact
                  />
                  {/* TODO <Route path={ROUTES.top} component={Top} exact /> */}
                  <Route path={ROUTES.top}>
                    <Redirect to={ROUTES.reservation} />
                  </Route>
                </Switch>
              </Suspense>
              <Footer />
            </BrowserRouter>
          </ErrorBoundary>
        </ThemeProvider>
      </ApolloProvider>
    </Auth0Provider>
  );
};

export default App;
