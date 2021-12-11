import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import { useMemo } from "react";
import { ROUTES } from "../../constants/routes";
import { useAuth0 } from "../../contexts/Auth0";
import { useIsMobile } from "../../hooks/useIsMobile";
import { SmallButton } from "../Button";
import { IconButton } from "../IconButton";

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
                returnTo: `${location.origin}${ROUTES.top}`,
              }),
          ]
        : [
            "ログイン",
            LoginIcon,
            () =>
              login({
                redirectUri: `${location.origin}${ROUTES.waiting}`,
              }),
          ],
    [token]
  );

  if (isLoading) {
    return null;
  }

  return isMobile ? (
    <IconButton onClick={onClick}>
      <Icon htmlColor="white" />
    </IconButton>
  ) : (
    <SmallButton onClick={onClick}>{text}</SmallButton>
  );
};
