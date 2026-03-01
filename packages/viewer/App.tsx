import { lazy, Suspense } from "react";
import { Redirect, Route, Router, Switch } from "wouter";
import { Header } from "./components/Header";
import { AuthGuard } from "./components/utils/AuthGuard";
import { ErrorBoundary } from "./components/utils/ErrorBoundary";
import { ScrollToTop } from "./components/utils/ScrollToTop";
import { ROUTES } from "./constants/routes";
import { ColorModeProvider } from "./contexts/ColorMode";
import { Loading } from "./pages/Loading";

/* istanbul ignore next -- lazy imports are exercised at runtime, not in unit tests */
const Institution = lazy(() => import("./pages/Institution"));
/* istanbul ignore next */
const Detail = lazy(() => import("./pages/Detail"));
/* istanbul ignore next */
const Reservation = lazy(() => import("./pages/Reservation"));
/* istanbul ignore next */
const Waiting = lazy(() => import("./pages/Waiting"));
/* istanbul ignore next */
const Top = lazy(() => import("./pages/Top"));
/* istanbul ignore next */
const Settings = lazy(() => import("./pages/Settings"));

const App = () => {
  return (
    <ErrorBoundary>
      <ColorModeProvider>
        <Router>
          <ScrollToTop />
          <Header />
          <ErrorBoundary>
            <Suspense fallback={<Loading />}>
              <Switch>
                <Route path={ROUTES.waiting}>
                  <Waiting />
                </Route>
                <Route path={ROUTES.reservation}>
                  <AuthGuard Component={<Reservation />} />
                </Route>
                <Route path={ROUTES.detail}>
                  <Detail />
                </Route>
                <Route path={ROUTES.institution}>
                  <Institution />
                </Route>
                <Route path={ROUTES.settings}>
                  <AuthGuard Component={<Settings />} />
                </Route>
                <Route path={ROUTES.top}>
                  <Top />
                </Route>
                <Route>
                  <Redirect to={ROUTES.top} />
                </Route>
              </Switch>
            </Suspense>
          </ErrorBoundary>
        </Router>
      </ColorModeProvider>
    </ErrorBoundary>
  );
};

export default App;
