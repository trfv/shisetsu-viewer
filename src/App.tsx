import { ApolloProvider } from "@apollo/client";
import { Auth0Provider } from "@auth0/auth0-react";
import { CssBaseline } from "@material-ui/core";
import { lazy, Suspense } from "react";
import { BrowserRouter, Redirect, Route, Switch } from "react-router-dom";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { AuthGuardRoute } from "./components/utils/AuthGuardRoute";
import { ErrorBoundary } from "./components/utils/ErrorBoundary";
import { ScrollToTop } from "./components/utils/ScrollToTop";
import { AUTH0_CLIENT_ID, AUTH0_DOMAIN } from "./constants/env";
import { ROUTES } from "./constants/routes";
import { Loading } from "./pages/Loading";
import { Waiting } from "./pages/Waiting";
import { apolloClient } from "./utils/client";
import { lightTheme as theme, ThemeProvider } from "./utils/theme";

const Institution = lazy(() => import("./pages/Institution"));
const Detail = lazy(() => import("./pages/Detail"));
const Reservation = lazy(() => import("./pages/Reservation"));

const App = () => {
  // const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  // const theme = useMemo(() => (prefersDarkMode ? darkTheme : lightTheme), [prefersDarkMode]);

  return (
    <Auth0Provider domain={AUTH0_DOMAIN} clientId={AUTH0_CLIENT_ID} useRefreshTokens={true}>
      <ApolloProvider client={apolloClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ErrorBoundary>
            <BrowserRouter>
              <ScrollToTop />
              <Header />
              <Suspense fallback={<Loading />}>
                <Switch>
                  <Route path={ROUTES.waiting} component={Waiting} />
                  <AuthGuardRoute path={ROUTES.reservation} component={Reservation} exact />
                  <AuthGuardRoute path={ROUTES.institution} component={Institution} exact />
                  <AuthGuardRoute path={ROUTES.detail} component={Detail} exact />
                  {/* TODO <Route path={ROUTES.top} component={Top} exact /> */}
                  <Route path={ROUTES.top}>
                    <Redirect to={ROUTES.reservation} />
                  </Route>
                </Switch>
                <Footer />
              </Suspense>
            </BrowserRouter>
          </ErrorBoundary>
        </ThemeProvider>
      </ApolloProvider>
    </Auth0Provider>
  );
};

export default App;
