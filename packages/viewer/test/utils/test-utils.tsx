import { render } from "@testing-library/react";
import { ReactElement, ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MockedProvider } from "@apollo/client/testing/react";
import type { MockLink } from "@apollo/client/testing";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { userEvent as browserUserEvent } from "@vitest/browser/context";

// Mock Auth0 provider
const MockAuth0Provider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

interface CustomRenderOptions {
  initialEntries?: string[];
  route?: string;
  mocks?: MockLink.MockedResponse[];
  auth0Config?: {
    isAuthenticated?: boolean;
    user?: unknown;
    isLoading?: boolean;
    loginWithRedirect?: () => void;
    logout?: () => void;
  };
  theme?: ReturnType<typeof createTheme>;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    initialEntries = ["/"],
    route = "/*",
    mocks = [],
    theme = createTheme(),
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  // Use browser's native userEvent
  const user = browserUserEvent;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MockedProvider
        mocks={mocks}
        showWarnings={false}
        defaultOptions={{
          watchQuery: { fetchPolicy: "no-cache", errorPolicy: "all" },
          query: { fetchPolicy: "no-cache", errorPolicy: "all" },
        }}
      >
        <MockAuth0Provider>
          <ThemeProvider theme={theme}>
            <MemoryRouter initialEntries={initialEntries}>
              <Routes>
                <Route path={route} element={children} />
              </Routes>
            </MemoryRouter>
          </ThemeProvider>
        </MockAuth0Provider>
      </MockedProvider>
    );
  }

  return {
    user,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Re-export everything from testing library
export * from "@testing-library/react";
export { userEvent } from "@vitest/browser/context";
