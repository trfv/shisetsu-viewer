import {
  Auth0Client,
  type Auth0ClientOptions,
  type GetTokenSilentlyOptions,
  type IdToken,
  type LogoutOptions,
  type RedirectLoginOptions,
} from "@auth0/auth0-spa-js";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";

const TOKEN_CLAIM_KEY = "https://app.shisetsudb.com/token/claims";
const TOKEN_REFRESH_INTERVAL = 60 * 60 * 1000;

type UserInfo = { anonymous: boolean; trial: boolean };

type Auth0ContextType = {
  token: string;
  userInfo: UserInfo;
  isPending: boolean;
  login: (o?: RedirectLoginOptions) => void;
  logout: (o?: LogoutOptions) => void;
};

const DEFAULT_USER_INFO: UserInfo = { anonymous: true, trial: false };

const initialContext: Auth0ContextType = {
  token: "",
  userInfo: DEFAULT_USER_INFO,
  isPending: false,
  login: () => undefined,
  logout: () => undefined,
};

export const Auth0Context = createContext<Auth0ContextType>(initialContext);

export const useAuth0 = () => use(Auth0Context);

const parseUserInfo = (claims?: IdToken): UserInfo => {
  const tokenClaims = claims?.[TOKEN_CLAIM_KEY];
  return {
    anonymous: tokenClaims?.role === "anonymous",
    trial: tokenClaims?.trial === true,
  };
};

type Props = Auth0ClientOptions & { children: ReactNode };

export const Auth0Provider = ({ children, ...clientOptions }: Props) => {
  const [client] = useState(() => new Auth0Client(clientOptions));
  const [token, setToken] = useState("");
  const [userInfo, setUserInfo] = useState<UserInfo>(DEFAULT_USER_INFO);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPending, startTransition] = useTransition();

  const authParams = useMemo(
    () => ({ authorizationParams: clientOptions.authorizationParams ?? {} }),
    [clientOptions.authorizationParams]
  ) as GetTokenSilentlyOptions;

  const updateAuth = useCallback(async () => {
    try {
      const newToken = await client.getTokenSilently(authParams);
      if (newToken) {
        const claims = await client.getIdTokenClaims();
        setToken(newToken);
        setUserInfo(parseUserInfo(claims));
        return true;
      }
    } catch {
      // Silent failure
    }
    return false;
  }, [client, authParams]);

  useEffect(() => {
    const init = async () => {
      try {
        await client.checkSession(authParams);
        await updateAuth();
      } catch {
        // Ignore
      }
      setIsInitialized(true);
    };

    init();

    const intervalId = setInterval(updateAuth, TOKEN_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [client, authParams, updateAuth]);

  const login = useCallback(
    (o: RedirectLoginOptions = {}) => {
      startTransition(async () => {
        await client.loginWithRedirect(o);
      });
    },
    [client]
  );

  const logout = useCallback(
    (o: LogoutOptions = {}) => {
      startTransition(async () => {
        await client.logout(o);
      });
    },
    [client]
  );

  const value = useMemo(
    () => ({ token, userInfo, isPending: isPending || !isInitialized, login, logout }),
    [token, userInfo, isPending, isInitialized, login, logout]
  );

  return <Auth0Context value={value}>{children}</Auth0Context>;
};
