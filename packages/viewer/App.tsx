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

  // Memoize ApolloClient to avoid recreating on every render
  const apolloClient = useMemo(() => createClient(token), [token]);

  return (
    <ErrorBoundary>
      <ClientProvider client={apolloClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Suspense fallback={<Loading />}>
            <RouterProvider router={router} />
          </Suspense>
        </ThemeProvider>
      </ClientProvider>
    </ErrorBoundary>
  );
};

export default App;
