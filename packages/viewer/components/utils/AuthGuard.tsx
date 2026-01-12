import { Navigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useAuth0 } from "../../contexts/Auth0";
import { Loading } from "../../pages/Loading";
import { Suspense } from "react";

export const AuthGuard = ({ Component }: { Component: React.ReactNode }): React.ReactNode => {
  const {
    isPending,
    userInfo: { anonymous },
  } = useAuth0();

  if (anonymous) {
    return isPending ? <Loading /> : <Navigate replace={true} to={ROUTES.top} />;
  }

  return <Suspense fallback={<Loading />}>{Component}</Suspense>;
};
