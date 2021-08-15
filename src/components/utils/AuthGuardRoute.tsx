import { useAuth0 } from "@auth0/auth0-react";
import { FC, useEffect, useState } from "react";
import { Route, RouteProps, useLocation } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { NEXT } from "../../constants/search";
import { Loading } from "../../pages/Loading";

// FIXME
export let TOKEN = "";

export const AuthGuardRoute: FC<RouteProps> = ({ component, ...rest }) => {
  const { isLoading, isAuthenticated, loginWithRedirect, getIdTokenClaims } = useAuth0();
  const location = useLocation();

  const [authState, setAuthState] = useState<"loading" | "authenticated">();

  useEffect(() => {
    if (isAuthenticated) {
      const fn = async () => {
        const res = await getIdTokenClaims();
        TOKEN = res.__raw;
        setAuthState("authenticated");
      };
      fn();
    } else {
      loginWithRedirect({
        redirectUri: `${window.location.origin}${ROUTES.waiting}?${NEXT}=${
          location.pathname
        }${encodeURIComponent(location.search)}`,
      });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isLoading) {
      setAuthState("loading");
    }
  }, [isLoading]);

  return (
    <Route
      {...rest}
      component={
        authState === "authenticated" ? component : authState === "loading" ? Loading : undefined
      }
    />
  );
};
