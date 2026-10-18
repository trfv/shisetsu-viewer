import { Redirect } from "wouter";

import { ROUTES } from "../../constants/routes";
import { useAuth } from "../../contexts/Auth";
import { Loading } from "../../pages/Loading";

export const AuthGuard = ({ Component }: { Component: React.ReactNode }): React.ReactNode => {
  const {
    isLoading,
    userInfo: { anonymous },
  } = useAuth();

  if (anonymous) {
    return isLoading ? <Loading /> : <Redirect to={ROUTES.top} replace />;
  }

  return Component;
};
