import { render } from "@testing-library/react";
import { ReactElement, ReactNode } from "react";
import { Route, Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
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
  auth0Config?: Auth0MockConfig;
}

export function renderWithProviders(
  ui: ReactElement,
  { initialEntries = ["/"], route, auth0Config = {}, ...renderOptions }: CustomRenderOptions = {}
) {
  // Use browser's native userEvent
  const user = browserUserEvent;

  const { hook } = memoryLocation({ path: initialEntries[0] ?? "/", static: true });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MockAuth0Provider config={auth0Config}>
        <Router hook={hook}>{route ? <Route path={route}>{children}</Route> : children}</Router>
      </MockAuth0Provider>
    );
  }

  return {
    user,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Re-export everything from testing library
export * from "@testing-library/react";
