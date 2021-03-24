import { useAuth0 } from "@auth0/auth0-react";
import React, { FC } from "react";
import { Route, RouteProps } from "react-router-dom";
import { Loading } from "../../components/utils/Loading";

export const AuthGuardRoute: FC<RouteProps> = ({ component, ...rest }) => {
  const { isLoading, isAuthenticated, loginWithRedirect } = useAuth0();
  if (!isAuthenticated) {
    loginWithRedirect();
  }
  return (
    <Route {...rest} component={isAuthenticated ? component : isLoading ? Loading : undefined} />
  );
};
