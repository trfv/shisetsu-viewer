import { lazy, Suspense, useMemo } from "react";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import { Header } from "./components/Header";
import { AuthGuard } from "./components/utils/AuthGuard";
import { ErrorBoundary } from "./components/utils/ErrorBoundary";
import { ScrollToTop } from "./components/utils/ScrollToTop";
import { ROUTES } from "./constants/routes";
import { useAuth0 } from "./contexts/Auth0";
import { Loading } from "./pages/Loading";
import { client, ClientProvider } from "./utils/client";
import { CssBaseline, darkTheme, lightTheme, ThemeProvider, useMediaQuery } from "./utils/theme";

const Institution = lazy(() => import("./pages/Institution"));
const Detail = lazy(() => import("./pages/Detail"));
const Reservation = lazy(() => import("./pages/Reservation"));
const Waiting = lazy(() => import("./pages/Waiting"));
const Top = lazy(() => import("./pages/Top"));

const Layout = () => {
  return (
    <>
      <ScrollToTop />
      <Header />
      <ErrorBoundary>
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </>
  );
};

const App = () => {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = useMemo(() => (prefersDarkMode ? darkTheme : lightTheme), [prefersDarkMode]);
  const { token } = useAuth0();
  const router = createBrowserRouter([
    {
      element: <Layout />,
      path: "/",
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

  return (
    <ErrorBoundary>
      <ClientProvider client={client(token)}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <RouterProvider router={router} />
        </ThemeProvider>
      </ClientProvider>
    </ErrorBoundary>
  );
};

export default App;
