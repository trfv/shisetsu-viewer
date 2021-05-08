import { useAuth0 } from "@auth0/auth0-react";
import React, { FC } from "react";
import { ROUTES } from "../../constants/routes";
import { SmallButton } from "../Button";

export const LoginButton: FC = () => {
  const { isLoading, isAuthenticated, loginWithRedirect, logout } = useAuth0();

  if (isLoading) {
    return null;
  }

  const [text, onClick] = isAuthenticated
    ? [
        "ログアウト",
        () =>
          logout({
            returnTo: `${window.location.origin}${ROUTES.top}`,
          }),
      ]
    : [
        "ログイン",
        () =>
          loginWithRedirect({
            redirectUri: `${window.location.origin}${ROUTES.waiting}`,
          }),
      ];

  return (
    <SmallButton color="inherit" variant="outlined" onClick={onClick}>
      {text}
    </SmallButton>
  );
};
