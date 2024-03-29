import { Navigate } from "react-router-dom";
import { ROUTES } from "../constants/routes";
import { useAuth0 } from "../contexts/Auth0";
import { Loading } from "./Loading";

export default () => {
  const { isLoading } = useAuth0();
  return isLoading ? <Loading /> : <Navigate to={ROUTES.top} />;
};
