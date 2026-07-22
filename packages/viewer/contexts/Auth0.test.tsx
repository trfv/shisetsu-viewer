import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { screen } from "../test/utils/test-utils";
import { Auth0Client } from "@auth0/auth0-spa-js";
import { Auth0Provider, useAuth0 } from "./Auth0";

// Auth0Client is globally mocked in browser-setup.ts.
// We access the mock instance methods through the constructor mock.

const TOKEN_CLAIM_KEY = "https://app.shisetsudb.com/token/claims";

type MockClientMethods = {
  checkSession: ReturnType<typeof vi.fn>;
  handleRedirectCallback: ReturnType<typeof vi.fn>;
  getTokenSilently: ReturnType<typeof vi.fn>;
  getIdTokenClaims: ReturnType<typeof vi.fn>;
  loginWithRedirect: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
};

// Helper to configure the Auth0Client constructor mock with specific method behaviors.
// Uses a regular function (not arrow) so it can be called with `new`.
const configureMockClient = (overrides: Partial<MockClientMethods> = {}): MockClientMethods => {
  const methods: MockClientMethods = {
    checkSession: overrides.checkSession ?? vi.fn().mockResolvedValue(undefined),
    handleRedirectCallback: overrides.handleRedirectCallback ?? vi.fn().mockResolvedValue({}),
    getTokenSilently: overrides.getTokenSilently ?? vi.fn().mockResolvedValue("mock-token"),
    getIdTokenClaims: overrides.getIdTokenClaims ?? vi.fn().mockResolvedValue({}),
    loginWithRedirect: overrides.loginWithRedirect ?? vi.fn().mockResolvedValue(undefined),
    logout: overrides.logout ?? vi.fn().mockResolvedValue(undefined),
  };

  const mockConstructor = Auth0Client as unknown as ReturnType<typeof vi.fn>;
  // Use a regular function so `new Auth0Client(...)` works correctly
  mockConstructor.mockImplementation(function (this: MockClientMethods) {
    Object.assign(this, methods);
    return this;
  });

  return methods;
};

// Helper component that reads Auth0Context values and displays them
const Auth0Consumer = () => {
  const { isLoading, token, userInfo, login, logout } = useAuth0();
  return (
    <div>
      <span data-testid="is-loading">{String(isLoading)}</span>
      <span data-testid="token">{token}</span>
      <span data-testid="anonymous">{String(userInfo.anonymous)}</span>
      <span data-testid="trial">{String(userInfo.trial)}</span>
      <button
        data-testid="login-btn"
        onClick={() => login({ authorizationParams: { redirect_uri: "http://localhost" } })}
      >
        Login
      </button>
      <button data-testid="logout-btn" onClick={() => logout({ logoutParams: {} })}>
        Logout
      </button>
    </div>
  );
};

const defaultProviderProps = {
  domain: "test.auth0.com",
  clientId: "test-client-id",
};

describe("Auth0Provider", () => {
  beforeEach(() => {
    // Restore the default mock implementation before each test
    configureMockClient();
  });

  describe("子コンポーネントのレンダリング", () => {
    it("子コンポーネントを正しくレンダリングする", async () => {
      await render(
        <Auth0Provider {...defaultProviderProps}>
          <div data-testid="child">Hello</div>
        </Auth0Provider>
      );

      await expect.element(screen.getByTestId("child")).toBeInTheDocument();
      expect(screen.getByTestId("child").element().textContent).toBe("Hello");
    });
  });

  describe("初期ローディング状態", () => {
    it("初期状態でisLoadingがtrueである", async () => {
      // Configure checkSession to never resolve so we can observe initial loading state
      configureMockClient({
        checkSession: vi.fn().mockReturnValue(new Promise(() => {})),
      });

      await render(
        <Auth0Provider {...defaultProviderProps}>
          <Auth0Consumer />
        </Auth0Provider>
      );

      expect(screen.getByTestId("is-loading").element().textContent).toBe("true");
    });

    it("checkSession完了後にisLoadingがfalseになる", async () => {
      await render(
        <Auth0Provider {...defaultProviderProps}>
          <Auth0Consumer />
        </Auth0Provider>
      );

      await expect.element(screen.getByTestId("is-loading")).toHaveTextContent(/^false$/);
    });
  });

  describe("checkSessionの呼び出し", () => {
    it("マウント時にcheckSessionが呼ばれる", async () => {
      const methods = configureMockClient();

      await render(
        <Auth0Provider {...defaultProviderProps}>
          <Auth0Consumer />
        </Auth0Provider>
      );

      await vi.waitFor(() => expect(methods.checkSession).toHaveBeenCalled());
    });
  });

  describe("リダイレクトコールバック", () => {
    it("URLにcodeとstateがある場合、handleRedirectCallbackが呼ばれる", async () => {
      const methods = configureMockClient();
      window.history.pushState({}, "", "/waiting?code=test-code&state=test-state");

      await render(
        <Auth0Provider {...defaultProviderProps}>
          <Auth0Consumer />
        </Auth0Provider>
      );

      await vi.waitFor(() => expect(methods.handleRedirectCallback).toHaveBeenCalled());
      expect(methods.checkSession).not.toHaveBeenCalled();

      window.history.pushState({}, "", "/");
    });

    it("URLにcodeとstateがない場合、checkSessionが呼ばれる", async () => {
      const methods = configureMockClient();
      window.history.pushState({}, "", "/");

      await render(
        <Auth0Provider {...defaultProviderProps}>
          <Auth0Consumer />
        </Auth0Provider>
      );

      await vi.waitFor(() => expect(methods.checkSession).toHaveBeenCalled());
      expect(methods.handleRedirectCallback).not.toHaveBeenCalled();
    });
  });

  describe("トークン取得", () => {
    it("getTokenSilently成功後にトークンがセットされる", async () => {
      configureMockClient({
        getTokenSilently: vi.fn().mockResolvedValue("test-token-123"),
        getIdTokenClaims: vi.fn().mockResolvedValue({
          [TOKEN_CLAIM_KEY]: { role: "user", trial: false },
        }),
      });

      await render(
        <Auth0Provider {...defaultProviderProps}>
          <Auth0Consumer />
        </Auth0Provider>
      );

      await expect.element(screen.getByTestId("token")).toHaveTextContent(/^test-token-123$/);
    });

    it("トークン取得後にuserInfoが正しくセットされる", async () => {
      configureMockClient({
        getTokenSilently: vi.fn().mockResolvedValue("test-token"),
        getIdTokenClaims: vi.fn().mockResolvedValue({
          [TOKEN_CLAIM_KEY]: { role: "user", trial: true },
        }),
      });

      await render(
        <Auth0Provider {...defaultProviderProps}>
          <Auth0Consumer />
        </Auth0Provider>
      );

      await expect.element(screen.getByTestId("anonymous")).toHaveTextContent(/^false$/);
      await expect.element(screen.getByTestId("trial")).toHaveTextContent(/^true$/);
    });

    it("anonymousロールの場合、userInfo.anonymousがtrueになる", async () => {
      configureMockClient({
        getTokenSilently: vi.fn().mockResolvedValue("anon-token"),
        getIdTokenClaims: vi.fn().mockResolvedValue({
          [TOKEN_CLAIM_KEY]: { role: "anonymous", trial: false },
        }),
      });

      await render(
        <Auth0Provider {...defaultProviderProps}>
          <Auth0Consumer />
        </Auth0Provider>
      );

      await expect.element(screen.getByTestId("anonymous")).toHaveTextContent(/^true$/);
      await expect.element(screen.getByTestId("trial")).toHaveTextContent(/^false$/);
    });
  });

  describe("ログイン", () => {
    it("loginがloginWithRedirectを呼び出す", async () => {
      const methods = configureMockClient();

      await render(
        <Auth0Provider {...defaultProviderProps}>
          <Auth0Consumer />
        </Auth0Provider>
      );

      await expect.element(screen.getByTestId("is-loading")).toHaveTextContent(/^false$/);

      await userEvent.click(screen.getByTestId("login-btn"));

      await vi.waitFor(() =>
        expect(methods.loginWithRedirect).toHaveBeenCalledWith({
          authorizationParams: { redirect_uri: "http://localhost" },
        })
      );
    });
  });

  describe("ログアウト", () => {
    it("logoutがauth0Client.logoutを呼び出す", async () => {
      const methods = configureMockClient();

      await render(
        <Auth0Provider {...defaultProviderProps}>
          <Auth0Consumer />
        </Auth0Provider>
      );

      await expect.element(screen.getByTestId("is-loading")).toHaveTextContent(/^false$/);

      await userEvent.click(screen.getByTestId("logout-btn"));

      await vi.waitFor(() => expect(methods.logout).toHaveBeenCalledWith({ logoutParams: {} }));
    });
  });

  describe("エラーハンドリング", () => {
    it("checkSessionが失敗してもisLoadingがfalseになる", async () => {
      configureMockClient({
        checkSession: vi.fn().mockRejectedValue(new Error("Session check failed")),
      });

      await render(
        <Auth0Provider {...defaultProviderProps}>
          <Auth0Consumer />
        </Auth0Provider>
      );

      await expect.element(screen.getByTestId("is-loading")).toHaveTextContent(/^false$/);
    });

    it("checkSessionが失敗した場合、トークンは空のままである", async () => {
      configureMockClient({
        checkSession: vi.fn().mockRejectedValue(new Error("Session check failed")),
      });

      await render(
        <Auth0Provider {...defaultProviderProps}>
          <Auth0Consumer />
        </Auth0Provider>
      );

      await expect.element(screen.getByTestId("is-loading")).toHaveTextContent(/^false$/);

      // Token should remain empty since checkSession failed before getTokenSilently
      expect(screen.getByTestId("token").element().textContent).toBe("");
    });

    it("getTokenSilentlyが失敗した場合、トークンは空のままである", async () => {
      configureMockClient({
        getTokenSilently: vi.fn().mockRejectedValue(new Error("Token fetch failed")),
      });

      await render(
        <Auth0Provider {...defaultProviderProps}>
          <Auth0Consumer />
        </Auth0Provider>
      );

      await expect.element(screen.getByTestId("is-loading")).toHaveTextContent(/^false$/);

      expect(screen.getByTestId("token").element().textContent).toBe("");
    });
  });

  describe("トークン取得 - falsyトークン", () => {
    it("getTokenSilentlyがfalsy値を返した場合、トークンは空のままである", async () => {
      configureMockClient({
        getTokenSilently: vi.fn().mockResolvedValue(""),
      });

      await render(
        <Auth0Provider {...defaultProviderProps}>
          <Auth0Consumer />
        </Auth0Provider>
      );

      await expect.element(screen.getByTestId("is-loading")).toHaveTextContent(/^false$/);

      // Token should remain empty because getTokenSilently returned falsy
      expect(screen.getByTestId("token").element().textContent).toBe("");
    });
  });

  describe("デフォルトコンテキスト", () => {
    it("Auth0Providerの外でuseAuth0を使用するとデフォルトのlogin/logoutが呼べる", async () => {
      await render(<Auth0Consumer />);

      expect(screen.getByTestId("is-loading").element().textContent).toBe("true");
      expect(screen.getByTestId("token").element().textContent).toBe("");

      // Default login and logout (from initialContext) should not throw when called
      await userEvent.click(screen.getByTestId("login-btn"));
      await userEvent.click(screen.getByTestId("logout-btn"));

      // Should still be in initial state (no crash)
      expect(screen.getByTestId("is-loading").element().textContent).toBe("true");
    });
  });

  describe("初期コンテキスト値", () => {
    it("初期状態のトークンは空文字列である", async () => {
      // Configure checkSession to never resolve so we can observe initial state
      configureMockClient({
        checkSession: vi.fn().mockReturnValue(new Promise(() => {})),
      });

      await render(
        <Auth0Provider {...defaultProviderProps}>
          <Auth0Consumer />
        </Auth0Provider>
      );

      expect(screen.getByTestId("token").element().textContent).toBe("");
    });

    it("初期状態のuserInfoはanonymous=true, trial=falseである", async () => {
      // Configure checkSession to never resolve so we can observe initial state
      configureMockClient({
        checkSession: vi.fn().mockReturnValue(new Promise(() => {})),
      });

      await render(
        <Auth0Provider {...defaultProviderProps}>
          <Auth0Consumer />
        </Auth0Provider>
      );

      expect(screen.getByTestId("anonymous").element().textContent).toBe("true");
      expect(screen.getByTestId("trial").element().textContent).toBe("false");
    });
  });
});
