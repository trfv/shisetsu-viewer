import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import { ROUTES } from "../../constants/routes";
import { useAuth0 } from "../../contexts/Auth0";
import { useIsMobile } from "../../hooks/useIsMobile";
import { SmallButton } from "../Button";
import { IconButton } from "../IconButton";

export const LoginButton = () => {
  const { isPending, token, login, logout } = useAuth0();
  const isMobile = useIsMobile();

  if (isPending) {
    return null;
  }

  const handleClick = token
    ? () => logout({ logoutParams: { returnTo: `${location.origin}${ROUTES.top}` } })
    : () => login();

  const text = token ? "ログアウト" : "ログイン";
  const Icon = token ? LogoutIcon : LoginIcon;

  return isMobile ? (
    <IconButton aria-label={text} onClick={handleClick}>
      <Icon htmlColor="white" />
    </IconButton>
  ) : (
    <SmallButton onClick={handleClick}>{text}</SmallButton>
  );
};
