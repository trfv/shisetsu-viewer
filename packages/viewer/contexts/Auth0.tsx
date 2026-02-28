import type {
  Auth0Client,
  Auth0ClientOptions,
  GetTokenSilentlyOptions,
  LogoutOptions,
  RedirectLoginOptions,
} from "@auth0/auth0-spa-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { requestInterval } from "../utils/interval";

const TOKEN_CLAIM_KEY = "https://app.shisetsudb.com/token/claims";

type Props = Auth0ClientOptions & {
  children: ReactNode;
};

type Auth0Context = {
  isLoading: boolean;
  token: string;
  userInfo: { anonymous: boolean; trial: boolean };
  login(o: RedirectLoginOptions): void;
  logout(o: LogoutOptions): void;
};

const initlalContext: Auth0Context = {
  isLoading: true,
  token: "",
  userInfo: { anonymous: true, trial: false },
  login: () => null,
  logout: () => null,
};

export const Auth0Context = createContext<Auth0Context>(initlalContext);
export const useAuth0 = () => useContext(Auth0Context);

export const Auth0Provider = ({ children, ...clientOptions }: Props) => {
  const [auth0Client, setAuth0Client] = useState<Auth0Client | null>(null);
  const [isLoading, setIsLoading] = useState(initlalContext.isLoading);
  const [token, setToken] = useState(initlalContext.token);
  const [userInfo, setUserInfo] = useState(initlalContext.userInfo);
  // Type assertion needed: Auth0 2.8.0 allows authorizationParams.scope to be
  // string | Record<string, string>, but GetTokenSilentlyOptions type still expects
  // only string. The runtime supports both formats, so this assertion is safe.
  const options = useMemo(
    () => ({
      authorizationParams: clientOptions.authorizationParams ?? {},
    }),
    [clientOptions.authorizationParams]
  ) as GetTokenSilentlyOptions;

  // Dynamically load Auth0 SDK to keep it out of the initial bundle
  useEffect(() => {
    import("@auth0/auth0-spa-js").then(({ Auth0Client: Client }) => {
      setAuth0Client(new Client(clientOptions));
    });
    // clientOptions are stable environment constants from index.tsx
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getIdTokenClaims = useCallback(async () => {
    if (!auth0Client) return undefined;
    const claims = await auth0Client.getIdTokenClaims();
    return claims?.[TOKEN_CLAIM_KEY];
  }, [auth0Client]);

  const login = useCallback(
    (o: RedirectLoginOptions) => auth0Client?.loginWithRedirect(o),
    [auth0Client]
  );

  const logout = useCallback((o: LogoutOptions) => auth0Client?.logout(o), [auth0Client]);

  const updateToken = useCallback(async () => {
    if (!auth0Client) return false;
    try {
      const token = await auth0Client.getTokenSilently(options);
      if (token) {
        setToken(token);
        const idTokenClaims = await getIdTokenClaims();
        setUserInfo({
          anonymous: idTokenClaims?.role === "anonymous",
          trial: idTokenClaims?.trial === true,
        });
        return true;
      } else {
        return false;
      }
    } catch {
      return false;
    }
  }, [auth0Client, options, getIdTokenClaims]);

  useEffect(() => {
    if (!auth0Client) return;

    const initAuth0 = async () => {
      try {
        await auth0Client.checkSession(options);
        await updateToken();
      } catch (e) {
        console.info(e);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth0();
    /* istanbul ignore next -- interval callback fires after 1 hour, untestable in unit tests */
    const intervalCleanup = requestInterval(() => updateToken(), 60 * 60 * 1000);

    return () => {
      intervalCleanup();
    };
  }, [auth0Client, updateToken, options]);

  return (
    <Auth0Context.Provider
      value={{
        isLoading,
        token,
        userInfo,
        login,
        logout,
      }}
    >
      {children}
    </Auth0Context.Provider>
  );
};
