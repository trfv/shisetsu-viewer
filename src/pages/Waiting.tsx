import { useAuth0 } from "@auth0/auth0-react";
import React, { FC, useEffect } from "react";
import { Redirect, useHistory } from "react-router-dom";
import { Loading } from "../components/utils/Loading";
import { ROUTES } from "../constants/routes";
import { NEXT } from "../constants/search";

export const Waiting: FC = () => {
  const { isLoading, isAuthenticated } = useAuth0();
  const history = useHistory();
  const next = new URLSearchParams(history.location.search).get(NEXT);
  useEffect(() => {
    if (isAuthenticated) {
      history.push(next ?? ROUTES.root);
    }
  }, [isAuthenticated]);
  return isLoading ? <Loading /> : <Redirect to={ROUTES.root} />;
};
