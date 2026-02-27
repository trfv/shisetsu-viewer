import { Suspense, useMemo } from "react";
import { RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "./components/utils/ErrorBoundary";
import { ColorModeProvider, useColorMode } from "./contexts/ColorMode";
import { useAuth0 } from "./contexts/Auth0";
import { Loading } from "./pages/Loading";
import { router } from "./router";
import { client, ClientProvider } from "./utils/client";
import { CssBaseline, ThemeProvider } from "./utils/theme";

const AppInner = () => {
  const { theme } = useColorMode();
  const { token } = useAuth0();
  const apolloClient = useMemo(() => client(token), [token]);

  return (
    <ClientProvider client={apolloClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Suspense fallback={<Loading />}>
          <RouterProvider router={router} />
        </Suspense>
      </ThemeProvider>
    </ClientProvider>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <ColorModeProvider>
        <AppInner />
      </ColorModeProvider>
    </ErrorBoundary>
  );
};

export default App;
