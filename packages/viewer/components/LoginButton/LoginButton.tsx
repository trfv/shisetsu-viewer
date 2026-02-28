import { useMemo } from "react";
import { ROUTES } from "../../constants/routes";
import { useAuth0 } from "../../contexts/Auth0";
import { useIsMobile } from "../../hooks/useIsMobile";
import { SmallButton } from "../Button";
import { IconButton } from "../IconButton";
import { LoginIcon, LogoutIcon } from "../icons";

export const LoginButton = () => {
  const { isLoading, token, login, logout } = useAuth0();
  const isMobile = useIsMobile();

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

  return isMobile ? (
    <IconButton aria-label={text} onClick={onClick} title={text}>
      <Icon htmlColor="white" />
    </IconButton>
  ) : (
    <SmallButton onClick={onClick}>{text}</SmallButton>
  );
};
