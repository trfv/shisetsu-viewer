import { FC } from "react";
import { ROUTES } from "../../constants/routes";
import { useAuth0 } from "../../utils/auth0";
import { SmallButton } from "../Button";

export const LoginButton: FC = () => {
  const { isLoading, token, login, logout } = useAuth0();

  if (isLoading) {
    return null;
  }

  const [text, onClick] = token
    ? [
        "ログアウト",
        () =>
          logout({
            returnTo: `${location.origin}${ROUTES.top}`,
          }),
      ]
    : [
        "ログイン",
        () =>
          login({
            redirectUri: `${location.origin}${ROUTES.waiting}`,
          }),
      ];

  return <SmallButton onClick={onClick}>{text}</SmallButton>;
};
