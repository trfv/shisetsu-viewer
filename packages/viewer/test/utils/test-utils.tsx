import { ReactElement, ReactNode, Suspense, useState } from "react";
import { render } from "vitest-browser-react";
import { page, userEvent as browserUserEvent } from "vitest/browser";
import { Route, Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

import { AuthContext } from "../../contexts/Auth";

export type AuthMockConfig = {
  pending?: boolean;
  authenticated?: boolean;
  userInfo?: { anonymous: boolean; trial: boolean };
};

export const MockAuthProvider = ({
  children,
  config = {},
}: {
  children: ReactNode;
  config?: AuthMockConfig;
}) => {
  const [value] = useState(() =>
    config.pending
      ? new Promise<never>(() => {})
      : Promise.resolve({
          authenticated: config.authenticated ?? true,
          userInfo: config.userInfo ?? { anonymous: false, trial: false },
        })
  );
  return (
    <AuthContext value={value}>
      <Suspense fallback={null}>{children}</Suspense>
    </AuthContext>
  );
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
