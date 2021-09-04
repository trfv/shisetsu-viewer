import { FC } from "react";
import { Route, RouteProps } from "react-router-dom";
import { Loading } from "../../pages/Loading";
import { useAuth0 } from "../../utils/auth0";

export const AuthGuardRoute: FC<RouteProps> = ({ component, ...rest }) => {
  const { isLoading, token } = useAuth0();
  return <Route {...rest} component={token ? component : isLoading ? Loading : undefined} />;
};
