import { ReactElement, ReactNode } from "react";
import { vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent as browserUserEvent } from "vitest/browser";
import { Route, Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

import { AuthContext } from "../../contexts/Auth";

type AuthMockConfig = {
  isLoading?: boolean;
  authenticated?: boolean;
  userInfo?: { anonymous: boolean; trial: boolean };
  login?: () => void;
  logout?: () => void;
};

const MockAuthProvider = ({
  children,
  config = {},
}: {
  children: ReactNode;
  config?: AuthMockConfig;
}) => {
  const value = {
    isLoading: config.isLoading ?? false,
    authenticated: config.authenticated ?? true,
    userInfo: config.userInfo ?? { anonymous: false, trial: false },
    login: config.login ?? vi.fn(),
    logout: config.logout ?? vi.fn(),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

interface CustomRenderOptions {
  initialEntries?: string[];
  route?: string;
  authConfig?: AuthMockConfig;
}

export async function renderWithProviders(
  ui: ReactElement,
  { initialEntries = ["/"], route, authConfig = {} }: CustomRenderOptions = {}
) {
  const user = browserUserEvent;

  // static にすると setLocation が useSearch() に伝わらず、URL 駆動のデータフローを再現できない。
  const { hook } = memoryLocation({ path: initialEntries[0] ?? "/" });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MockAuthProvider config={authConfig}>
        <Router hook={hook}>{route ? <Route path={route}>{children}</Route> : children}</Router>
      </MockAuthProvider>
    );
  }

  const result = await render(ui, { wrapper: Wrapper });

  return {
    user,
    ...result,
  };
}

// Testing Library の `screen` と違い queryBy*/findBy*/getAllBy* は無い。不在は
// expect.element(...).not.toBeInTheDocument()、複数要素は getBy*(...).all() を使う。
export const screen = page;
