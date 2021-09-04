import { BrowserRouter } from "react-router-dom";
import { Header } from "./components/Header";
import { ErrorBoundary } from "./components/utils/ErrorBoundary";
import { ScrollToTop } from "./components/utils/ScrollToTop";
import { Maintenance } from "./pages/Maintenance";
import { useAuth0 } from "./utils/auth0";
import { apolloClient, ApolloProvider } from "./utils/client";
import { CssBaseline, lightTheme as theme, ThemeProvider } from "./utils/theme";

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
            <Maintenance />
          </BrowserRouter>
        </ErrorBoundary>
      </ThemeProvider>
    </ApolloProvider>
  );
};

export default App;
