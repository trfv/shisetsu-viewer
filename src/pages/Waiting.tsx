import { FC } from "react";
import { Redirect, useHistory } from "react-router-dom";
import { NEXT, ROUTES } from "../constants/routes";
import { useAuth0 } from "../utils/auth0";
import { Loading } from "./Loading";

export const Waiting: FC = () => {
  const { isLoading } = useAuth0();
  const history = useHistory();
  const next = new URLSearchParams(history.location.search).get(NEXT) ?? ROUTES.top;
  return isLoading ? <Loading /> : <Redirect to={next} />;
};
