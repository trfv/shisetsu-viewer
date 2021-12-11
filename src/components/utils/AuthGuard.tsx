import { Navigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useAuth0 } from "../../contexts/Auth0";
import { Loading } from "../../pages/Loading";

export const AuthGuard = ({ children }: { children: JSX.Element }) => {
  const { isLoading, token } = useAuth0();

  if (!token) {
    return isLoading ? <Loading /> : <Navigate to={ROUTES.top} />;
  }

  return children;
};
