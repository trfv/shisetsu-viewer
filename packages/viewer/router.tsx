import { lazy } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import { Header } from "./components/Header";
import { AuthGuard } from "./components/utils/AuthGuard";
import { ErrorBoundary } from "./components/utils/ErrorBoundary";
import { ScrollToTop } from "./components/utils/ScrollToTop";
import { ROUTES } from "./constants/routes";

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

/* istanbul ignore next -- Layout is rendered by the router at runtime */
const Layout = () => (
  <>
    <ScrollToTop />
    <Header />
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  </>
);

export const router = createBrowserRouter([
  {
    element: <Layout />,
    path: "/",
    errorElement: <ErrorBoundary />,
    children: [
      {
        path: ROUTES.waiting,
        element: <Waiting />,
      },
      {
        path: ROUTES.reservation,
        element: <AuthGuard Component={<Reservation />} />,
      },
      {
        path: ROUTES.institution,
        element: <Institution />,
      },
      {
        path: ROUTES.detail,
        element: <Detail />,
      },
      {
        path: ROUTES.top,
        element: <Top />,
      },
    ],
  },
]);
