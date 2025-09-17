import {
  Auth0Client,
  User,
  type Auth0ClientOptions,
  type GetTokenSilentlyOptions,
  type LogoutOptions,
  type RedirectLoginOptions,
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

type Role = "user" | "anonymous";
const ROLE_NAMESPACE = "https://app.shisetsudb.com/role";
type CustomUser = User & { [ROLE_NAMESPACE]: Role };

type Props = Auth0ClientOptions & {
  children: ReactNode;
};

type Auth0Context = {
  isLoading: boolean;
  token: string;
  isAnonymous: boolean;
  login(o: RedirectLoginOptions): void;
  logout(o: LogoutOptions): void;
};

const initlalContext: Auth0Context = {
  isLoading: true,
  token: "",
  isAnonymous: true,
  login: () => null,
  logout: () => null,
};

export const Auth0Context = createContext<Auth0Context>(initlalContext);
export const useAuth0 = () => useContext(Auth0Context);

export const Auth0Provider = ({ children, ...clientOptions }: Props) => {
  const [auth0Client] = useState(() => new Auth0Client(clientOptions));
  const [isLoading, setIsLoading] = useState(initlalContext.isLoading);
  const [token, setToken] = useState(initlalContext.token);
  const [isAnonymous, setIsAnonymous] = useState(initlalContext.isAnonymous);
  const options: GetTokenSilentlyOptions = useMemo(
    () => ({
      authorizationParams: clientOptions.authorizationParams ?? {},
    }),
    [clientOptions.authorizationParams]
  );

  const getRole = useCallback(async () => {
    const user = await auth0Client.getUser<CustomUser>();
    return user?.[ROLE_NAMESPACE] || "anonymous";
  }, [auth0Client]);

  const login = useCallback(
    (o: RedirectLoginOptions) => auth0Client.loginWithRedirect(o),
    [auth0Client]
  );

  const logout = useCallback((o: LogoutOptions) => auth0Client.logout(o), [auth0Client]);

  const updateToken = useCallback(async () => {
    try {
      const token = await auth0Client.getTokenSilently(options);
      if (token) {
        setToken(token);
        setIsAnonymous((await getRole()) === "anonymous");
        return true;
      } else {
        return false;
      }
    } catch {
      return false;
    }
  }, [auth0Client, options, getRole]);

  useEffect(() => {
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
        isAnonymous,
        login,
        logout,
      }}
    >
      {children}
    </Auth0Context.Provider>
  );
};
