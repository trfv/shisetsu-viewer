import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { AuthGuardRoute } from "./components/utils/AuthGuardRoute";
import { ErrorBoundary } from "./components/utils/ErrorBoundary";
import { ScrollToTop } from "./components/utils/ScrollToTop";
import { ROUTES } from "./constants/routes";
import { Loading } from "./pages/Loading";
import { useAuth0 } from "./utils/auth0";
import { apolloClient, ApolloProvider } from "./utils/client";
import { CssBaseline, lightTheme as theme, ThemeProvider } from "./utils/theme";

const Institution = lazy(() => import("./pages/Institution"));
const Detail = lazy(() => import("./pages/Detail"));
const Reservation = lazy(() => import("./pages/Reservation"));
const Waiting = lazy(() => import("./pages/Waiting"));
const Top = lazy(() => import("./pages/Top"));

const App = () => {
  // const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  // const theme = useMemo(() => (prefersDarkMode ? darkTheme : lightTheme), [prefersDarkMode]);

  const { token } = useAuth0();

  return (
    <ApolloProvider client={apolloClient(token)}>
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
                <Route path={ROUTES.top} component={Top} exact />
              </Switch>
              <Footer />
            </Suspense>
          </BrowserRouter>
        </ErrorBoundary>
      </ThemeProvider>
    </ApolloProvider>
  );
};

export default App;
