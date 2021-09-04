import type { Auth0ClientOptions, LogoutOptions, RedirectLoginOptions } from "@auth0/auth0-spa-js";
import { Auth0Client } from "@auth0/auth0-spa-js";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface Auth0Context {
  isLoading: boolean;
  token: string;
  login(o: RedirectLoginOptions): void;
  logout(o: LogoutOptions): void;
}

const initlalContext: Auth0Context = {
  isLoading: true,
  token: "",
  login: () => null,
  logout: () => null,
};

export const Auth0Context = createContext<Auth0Context>(initlalContext);
export const useAuth0 = () => useContext(Auth0Context);

export const Auth0Provider = ({ children, ...initOptions }: Auth0ClientOptions) => {
  const [auth0Client] = useState(() => new Auth0Client(initOptions));
  const [isLoading, setIsLoading] = useState(initlalContext.isLoading);
  const [token, setToken] = useState(initlalContext.token);

  useEffect(() => {
    const initAuth0 = async () => {
      try {
        await auth0Client.checkSession();
        const token = await getToken();
        setToken(token);
      } catch (e) {
        console.info(e);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth0();
  }, []);

  const getToken = useCallback(async () => {
    try {
      await auth0Client.getTokenSilently();
      const claims = await auth0Client.getIdTokenClaims();
      return claims?.__raw ?? "";
    } catch (e) {
      return "";
    }
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
        login,
        logout,
      }}
    >
      {children}
    </Auth0Context.Provider>
  );
};
