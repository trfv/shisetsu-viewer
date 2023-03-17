import { Navigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useAuth0 } from "../../contexts/Auth0";
import { Loading } from "../../pages/Loading";

export const AuthGuard = ({ Component }: { Component: JSX.Element }): JSX.Element => {
  const { isLoading, isAnonymous } = useAuth0();

  if (isAnonymous) {
    return isLoading ? <Loading /> : <Navigate replace={true} to={ROUTES.top} />;
  }

  return Component;
};
