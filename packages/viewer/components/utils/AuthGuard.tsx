import { Redirect } from "wouter";

import { ROUTES } from "../../constants/routes";
import { useAuth } from "../../contexts/Auth";

export const AuthGuard = ({ Component }: { Component: React.ReactNode }): React.ReactNode => {
  const {
    userInfo: { anonymous },
  } = useAuth();

  if (anonymous) {
    return <Redirect to={ROUTES.top} replace />;
  }

  return Component;
};
