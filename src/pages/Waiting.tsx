import { Redirect } from "react-router-dom";
import { ROUTES } from "../constants/routes";
import { useAuth0 } from "../utils/auth0";
import { Loading } from "./Loading";

export default () => {
  const { isLoading } = useAuth0();
  return isLoading ? <Loading /> : <Redirect to={ROUTES.top} />;
};
