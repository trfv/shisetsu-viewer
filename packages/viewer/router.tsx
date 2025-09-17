import { lazy } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import { Header } from "./components/Header";
import { AuthGuard } from "./components/utils/AuthGuard";
import { ErrorBoundary } from "./components/utils/ErrorBoundary";
import { ScrollToTop } from "./components/utils/ScrollToTop";
import { ROUTES } from "./constants/routes";

const Institution = lazy(() => import("./pages/Institution"));
const Detail = lazy(() => import("./pages/Detail"));
const Reservation = lazy(() => import("./pages/Reservation"));
const Waiting = lazy(() => import("./pages/Waiting"));
const Top = lazy(() => import("./pages/Top"));

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
