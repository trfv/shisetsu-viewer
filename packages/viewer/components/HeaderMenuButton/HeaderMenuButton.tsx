import Close from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import Drawer from "@mui/material/Drawer";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useAuth0 } from "../../contexts/Auth0";
import { styled } from "../../utils/theme";
import { IconButton } from "../IconButton";

export const HeaderMenuButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    userInfo: { anonymous, trial },
  } = useAuth0();

  const toggleDrawer = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <>
      <IconButton onClick={toggleDrawer}>
        <MenuIcon aria-label="MenuIcon" htmlColor="white" />
      </IconButton>
      <Drawer anchor="top" onClose={toggleDrawer} open={isOpen}>
        <StyledMenu>
          <IconButton edge="start" onClick={toggleDrawer}>
            <Close />
          </IconButton>
          {anonymous ? (
            <span>予約検索</span>
          ) : (
            <Link onClick={toggleDrawer} to={ROUTES.reservation}>
              {`予約検索${trial ? "（トライアル）" : ""}`}
            </Link>
          )}
          <Link onClick={toggleDrawer} to={ROUTES.institution}>
            施設検索
          </Link>
        </StyledMenu>
      </Drawer>
    </>
  );
};

const StyledMenu = styled("div")(({ theme }) => ({
  padding: theme.spacing(2),
  display: "flex",
  alignItems: "center",
  "> a, span": {
    marginLeft: theme.spacing(2),
    color: theme.palette.text.primary,
    textDecoration: "none",
    borderBottom: `1px solid transparent`,
  },
  "> a": {
    ":hover": {
      borderBottom: `1px solid ${theme.palette.text.primary}`,
    },
  },
  "> span": {
    color: theme.palette.grey[500],
  },
}));
