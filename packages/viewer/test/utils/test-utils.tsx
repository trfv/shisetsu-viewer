import { render } from "vitest-browser-react";
import { ReactElement, ReactNode } from "react";
import { Route, Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { page, userEvent as browserUserEvent } from "vitest/browser";
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

export async function renderWithProviders(
  ui: ReactElement,
  { initialEntries = ["/"], route, auth0Config = {} }: CustomRenderOptions = {}
) {
  // Use browser's native userEvent
  const user = browserUserEvent;

  // 非 static: setLocation → useSearch() の伝播を有効にし、URL 駆動のデータフローを忠実に再現する。
  // wouter の Router は hook.searchHook を自動継承するため、useSearch() は memory-location の
  // クエリ文字列を読む。
  const { hook } = memoryLocation({ path: initialEntries[0] ?? "/" });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MockAuth0Provider config={auth0Config}>
        <Router hook={hook}>{route ? <Route path={route}>{children}</Route> : children}</Router>
      </MockAuth0Provider>
    );
  }

  const result = await render(ui, { wrapper: Wrapper });

  return {
    user,
    ...result,
  };
}

// ページ全体を対象とする locator セレクタ。Testing Library の `screen` の後継。
// getBy* は Locator を返す（遅延評価・自動リトライ）。queryBy*/findBy*/getAllBy* は
// 存在しないため、不在アサーションは expect.element(...).not.toBeInTheDocument()、
// 複数要素は getBy*(...).all() を使う。
export const screen = page;
