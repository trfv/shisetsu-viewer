import {
  Auth0Client,
  type Auth0ClientOptions,
  type GetTokenSilentlyOptions,
  type LogoutOptions,
  type RedirectLoginOptions,
} from "@auth0/auth0-spa-js";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

const TOKEN_CLAIM_KEY = "https://app.shisetsudb.com/token/claims";
const TOKEN_REFRESH_INTERVAL = 60 * 60 * 1000; // 60 minutes

type Props = Auth0ClientOptions & {
  children: ReactNode;
};

type UserInfo = {
  anonymous: boolean;
  trial: boolean;
};

type Auth0ContextType = {
  token: string;
  userInfo: UserInfo;
  isPending: boolean;
  login(o?: RedirectLoginOptions): void;
  logout(o?: LogoutOptions): void;
};

const initialUserInfo: UserInfo = { anonymous: true, trial: false };

const initialContext: Auth0ContextType = {
  token: "",
  userInfo: initialUserInfo,
  isPending: false,
  login: () => undefined,
  logout: () => undefined,
};

export const Auth0Context = createContext<Auth0ContextType>(initialContext);

/**
 * React 19: use() hook for context consumption
 * This is the recommended way to consume context in React 19
 */
export const useAuth0 = () => use(Auth0Context);

/**
 * Creates a cached promise for Auth0 initialization
 * This ensures the promise is stable across renders
 */
const createInitPromise = (
  client: Auth0Client,
  options: GetTokenSilentlyOptions
): Promise<{ token: string; userInfo: UserInfo }> => {
  return (async () => {
    try {
      await client.checkSession(options);
      const token = await client.getTokenSilently(options);
      if (token) {
        const claims = await client.getIdTokenClaims();
        const idTokenClaims = claims?.[TOKEN_CLAIM_KEY];
        return {
          token,
          userInfo: {
            anonymous: idTokenClaims?.role === "anonymous",
            trial: idTokenClaims?.trial === true,
          },
        };
      }
    } catch {
      // Silent failure for unauthenticated users
    }
    return { token: "", userInfo: initialUserInfo };
  })();
};

/**
 * Auth0Provider with React 19 best practices:
 * - Uses Context directly instead of Context.Provider (React 19 feature)
 * - Uses useTransition for non-blocking login/logout operations
 * - Maintains stable promise reference for initialization
 */
export const Auth0Provider = ({ children, ...clientOptions }: Props) => {
  const [auth0Client] = useState(() => new Auth0Client(clientOptions));
  const [token, setToken] = useState("");
  const [userInfo, setUserInfo] = useState<UserInfo>(initialUserInfo);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Stable options reference
  const options = useMemo(
    () => ({
      authorizationParams: clientOptions.authorizationParams ?? {},
    }),
    [clientOptions.authorizationParams]
  ) as GetTokenSilentlyOptions;

  // Ref to track initialization promise
  const initPromiseRef = useRef<Promise<{ token: string; userInfo: UserInfo }> | null>(null);

  // Token update function
  const updateToken = useCallback(async () => {
    try {
      const newToken = await auth0Client.getTokenSilently(options);
      if (newToken) {
        const claims = await auth0Client.getIdTokenClaims();
        const idTokenClaims = claims?.[TOKEN_CLAIM_KEY];
        setToken(newToken);
        setUserInfo({
          anonymous: idTokenClaims?.role === "anonymous",
          trial: idTokenClaims?.trial === true,
        });
        return true;
      }
    } catch {
      // Silent failure
    }
    return false;
  }, [auth0Client, options]);

  // Initialize Auth0 on mount
  useEffect(() => {
    if (!initPromiseRef.current) {
      initPromiseRef.current = createInitPromise(auth0Client, options);
    }

    initPromiseRef.current.then(({ token: initialToken, userInfo: initialUserInfo }) => {
      setToken(initialToken);
      setUserInfo(initialUserInfo);
      setIsInitialized(true);
    });

    // Token refresh interval
    const intervalId = setInterval(() => {
      updateToken();
    }, TOKEN_REFRESH_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [auth0Client, options, updateToken]);

  /**
   * React 19: useTransition for login
   * Wraps the redirect in a transition to keep UI responsive
   */
  const login = useCallback(
    (o: RedirectLoginOptions = {}) => {
      startTransition(async () => {
        await auth0Client.loginWithRedirect(o);
      });
    },
    [auth0Client]
  );

  /**
   * React 19: useTransition for logout
   * Wraps the logout in a transition to keep UI responsive
   */
  const logout = useCallback(
    (o: LogoutOptions = {}) => {
      startTransition(async () => {
        await auth0Client.logout(o);
      });
    },
    [auth0Client]
  );

  const contextValue = useMemo(
    () => ({
      token,
      userInfo,
      isPending: isPending || !isInitialized,
      login,
      logout,
    }),
    [token, userInfo, isPending, isInitialized, login, logout]
  );

  // React 19: Use Context directly as JSX element instead of Context.Provider
  return <Auth0Context value={contextValue}>{children}</Auth0Context>;
};
