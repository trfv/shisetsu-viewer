import { useAuth0 } from "@auth0/auth0-react";
import React, { FC } from "react";
import { Route, RouteProps, useLocation } from "react-router-dom";
import { Loading } from "../../components/utils/Loading";
import { ROUTES } from "../../constants/routes";
import { NEXT } from "../../constants/search";

export const AuthGuardRoute: FC<RouteProps> = ({ component, ...rest }) => {
  const { isLoading, isAuthenticated, loginWithRedirect } = useAuth0();
  const location = useLocation();
  if (!isAuthenticated) {
    loginWithRedirect({
      redirectUri: `${window.location.origin}${ROUTES.waiting}?${NEXT}=${
        location.pathname
      }${encodeURIComponent(location.search)}`,
    });
  }
  return (
    <Route {...rest} component={isAuthenticated ? component : isLoading ? Loading : undefined} />
  );
};
