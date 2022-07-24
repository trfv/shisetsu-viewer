import {
  Auth0Client,
  Auth0ClientOptions,
  LogoutOptions,
  RedirectLoginOptions,
  User,
} from "@auth0/auth0-spa-js";
import { createContext, useCallback, useContext, useState } from "react";
import { useMount } from "../hooks/useMount";
import { requestInterval } from "../utils/interval";

type Role = "user" | "anonymous";
const ROLE_NAMESPACE = "https://app.shisetsudb.com/role";

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

export const Auth0Provider = ({ children, ...initOptions }: Auth0ClientOptions) => {
  const [auth0Client] = useState(() => new Auth0Client(initOptions));
  const [isLoading, setIsLoading] = useState(initlalContext.isLoading);
  const [token, setToken] = useState(initlalContext.token);
  const [isAnonymous, setIsAnonymous] = useState(initlalContext.isAnonymous);

  useMount(
    async () => {
      const initAuth0 = async () => {
        try {
          await auth0Client.checkSession();
          await updateToken();
        } catch (e) {
          console.info(e);
        } finally {
          setIsLoading(false);
        }
      };
      return initAuth0();
    },
    () => requestInterval(updateToken, 60 * 60 * 1000)
  );

  const updateToken = useCallback(async () => {
    try {
      const token = await auth0Client.getTokenSilently({
        audience: initOptions.audience ?? "",
      });
      if (token) {
        setToken(token);
        setIsAnonymous((await getRole()) === "anonymous");
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  }, [auth0Client]);

  const getRole = useCallback(async () => {
    const user = await auth0Client.getUser<User & { [ROLE_NAMESPACE]: Role }>();
    return user?.[ROLE_NAMESPACE] || "anonymous";
  }, [auth0Client]);

  const login = useCallback(
    (o: RedirectLoginOptions) => auth0Client.loginWithRedirect(o),
    [auth0Client]
  );

  const logout = useCallback((o: LogoutOptions) => auth0Client.logout(o), [auth0Client]);

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
