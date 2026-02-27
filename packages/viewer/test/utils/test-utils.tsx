import { render } from "@testing-library/react";
import { ReactElement, ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MockedProvider } from "@apollo/client/testing/react";
import type { MockLink } from "@apollo/client/testing";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { userEvent as browserUserEvent } from "vitest/browser";
import { vi } from "vitest";
import { Auth0Context } from "../../contexts/Auth0";

type Auth0MockConfig = {
  isLoading?: boolean;
  token?: string;
  userInfo?: { anonymous: boolean; trial: boolean };
  login?: () => void;
  logout?: () => void;
};

const MockAuth0Provider = ({
  children,
  config = {},
}: {
  children: ReactNode;
  config?: Auth0MockConfig;
}) => {
  const value = {
    isLoading: config.isLoading ?? false,
    token: config.token ?? "mock-token",
    userInfo: config.userInfo ?? { anonymous: false, trial: false },
    login: config.login ?? vi.fn(),
    logout: config.logout ?? vi.fn(),
  };
  return <Auth0Context.Provider value={value}>{children}</Auth0Context.Provider>;
};

interface CustomRenderOptions {
  initialEntries?: string[];
  route?: string;
  mocks?: MockLink.MockedResponse[];
  auth0Config?: Auth0MockConfig;
  theme?: ReturnType<typeof createTheme>;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    initialEntries = ["/"],
    route = "/*",
    mocks = [],
    auth0Config = {},
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
        <MockAuth0Provider config={auth0Config}>
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
