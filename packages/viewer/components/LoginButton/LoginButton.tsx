import { useMemo } from "react";
import { ROUTES } from "../../constants/routes";
import { useAuth0 } from "../../contexts/Auth0";
import { IconButton } from "../IconButton";
import { LoginIcon, LogoutIcon } from "../icons";

export const LoginButton = () => {
  const { isLoading, token, login, logout } = useAuth0();

  const [text, Icon, onClick] = useMemo(
    () =>
      token
        ? [
            "ログアウト",
            LogoutIcon,
            () =>
              logout({
                logoutParams: {
                  returnTo: `${location.origin}${ROUTES.top}`,
                },
              }),
          ]
        : ["ログイン", LoginIcon, () => login({})],
    [token, login, logout]
  );

  if (isLoading) {
    return null;
  }

  return (
    <IconButton aria-label={text} onClick={onClick} title={text}>
      <Icon htmlColor="white" />
    </IconButton>
  );
};
