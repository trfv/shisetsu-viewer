import { Navigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { Loading } from "../../pages/Loading";
import { useAuth0 } from "../../utils/auth0";

export const AuthGuard = ({ children }: { children: JSX.Element }) => {
  const { isLoading, token } = useAuth0();

  if (!token) {
    return isLoading ? <Loading /> : <Navigate to={ROUTES.top} />;
  }

  return children;
};
