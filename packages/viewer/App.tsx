import { Suspense, useMemo } from "react";
import { RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "./components/utils/ErrorBoundary";
import { useAuth0 } from "./contexts/Auth0";
import { Loading } from "./pages/Loading";
import { router } from "./router";
import { createClient, ClientProvider } from "./utils/client";
import { CssBaseline, darkTheme, lightTheme, ThemeProvider, useMediaQuery } from "./utils/theme";

const App = () => {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = useMemo(() => (prefersDarkMode ? darkTheme : lightTheme), [prefersDarkMode]);
  const { token } = useAuth0();

  const apolloClient = useMemo(() => createClient(token), [token]);

  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <ClientProvider client={apolloClient}>
          <ThemeProvider theme={theme}>
            <CssBaseline />

            <RouterProvider router={router} />
          </ThemeProvider>
        </ClientProvider>
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;
