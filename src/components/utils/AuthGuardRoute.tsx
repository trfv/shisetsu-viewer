import { useAuth0 } from "@auth0/auth0-react";
import React, { FC } from "react";
import { Route, RouteProps, useLocation } from "react-router-dom";
import { Loading } from "../../components/utils/Loading";
import { ROUTES } from "../../constants/routes";

export const AuthGuardRoute: FC<RouteProps> = ({ component, ...rest }) => {
  const { isLoading, isAuthenticated, loginWithRedirect } = useAuth0();
  const location = useLocation();
  if (!isAuthenticated) {
    loginWithRedirect({
      redirectUri: `${window.location.origin}${ROUTES.waiting}?next=${location.pathname}${location.search}`,
    });
  }
  return (
    <Route {...rest} component={isAuthenticated ? component : isLoading ? Loading : undefined} />
  );
};
