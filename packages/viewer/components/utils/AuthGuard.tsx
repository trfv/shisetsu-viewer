import { Navigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useAuth0 } from "../../contexts/Auth0";
import { Loading } from "../../pages/Loading";

export const AuthGuard = ({ Component }: { Component: React.ReactNode }): React.ReactNode => {
  const {
    isLoading,
    userInfo: { anonymous },
  } = useAuth0();

  if (anonymous) {
    return isLoading ? <Loading /> : <Navigate replace={true} to={ROUTES.top} />;
  }

  return Component;
};
