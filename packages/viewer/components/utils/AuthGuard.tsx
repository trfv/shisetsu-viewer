import { Redirect } from "wouter";
import { ROUTES } from "../../constants/routes";
import { useAuth0 } from "../../contexts/Auth0";
import { Loading } from "../../pages/Loading";

export const AuthGuard = ({ Component }: { Component: React.ReactNode }): React.ReactNode => {
  const {
    isLoading,
    userInfo: { anonymous },
  } = useAuth0();

  if (anonymous) {
    return isLoading ? <Loading /> : <Redirect to={ROUTES.top} replace />;
  }

  return Component;
};
