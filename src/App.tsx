import { lazy, Suspense, useMemo } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { AuthGuard } from "./components/utils/AuthGuard";
import { ErrorBoundary } from "./components/utils/ErrorBoundary";
import { ScrollToTop } from "./components/utils/ScrollToTop";
import { ROUTES } from "./constants/routes";
import { Loading } from "./pages/Loading";
import { useAuth0 } from "./utils/auth0";
import { apolloClient, ApolloProvider } from "./utils/client";
import { CssBaseline, darkTheme, lightTheme, ThemeProvider, useMediaQuery } from "./utils/theme";

const Institution = lazy(() => import("./pages/Institution"));
const Detail = lazy(() => import("./pages/Detail"));
const Reservation = lazy(() => import("./pages/Reservation"));
const Waiting = lazy(() => import("./pages/Waiting"));
const Top = lazy(() => import("./pages/Top"));

const App = () => {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = useMemo(() => (prefersDarkMode ? darkTheme : lightTheme), [prefersDarkMode]);

  const { token } = useAuth0();

  return (
    <ApolloProvider client={apolloClient(token)}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary>
          <BrowserRouter>
            <ScrollToTop />
            <Header />
            <Routes>
              <Route
                path={ROUTES.waiting}
                element={
                  <Suspense fallback={<Loading />}>
                    <Waiting />
                  </Suspense>
                }
              />
              <Route
                path={ROUTES.reservation}
                element={
                  <Suspense fallback={<Loading />}>
                    <AuthGuard>
                      <Reservation />
                    </AuthGuard>
                  </Suspense>
                }
              />
              <Route
                path={ROUTES.institution}
                element={
                  <Suspense fallback={<Loading />}>
                    <AuthGuard>
                      <Institution />
                    </AuthGuard>
                  </Suspense>
                }
              />
              <Route
                path={ROUTES.detail}
                element={
                  <Suspense fallback={<Loading />}>
                    <AuthGuard>
                      <Detail />
                    </AuthGuard>
                  </Suspense>
                }
              />
              <Route
                path={ROUTES.top}
                element={
                  <Suspense fallback={<Loading />}>
                    <Top />
                  </Suspense>
                }
              />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </ThemeProvider>
    </ApolloProvider>
  );
};

export default App;
