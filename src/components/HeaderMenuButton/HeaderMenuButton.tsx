import MenuIcon from "@mui/icons-material/Menu";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { styled } from "../../utils/theme";
import { IconButton } from "../IconButton";

export const HeaderMenuButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDrawer = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <>
      <IconButton onClick={toggleDrawer}>
        <MenuIcon htmlColor="white" />
      </IconButton>
      <SwipeableDrawer anchor="top" onOpen={toggleDrawer} onClose={toggleDrawer} open={isOpen}>
        <StyledMenu>
          <IconButton>
            <MenuIcon onClick={toggleDrawer} />
          </IconButton>
          <Link to={ROUTES.reservation} onClick={toggleDrawer}>
            予約検索
          </Link>
          <Link to={ROUTES.institution} onClick={toggleDrawer}>
            施設検索
          </Link>
        </StyledMenu>
      </SwipeableDrawer>
    </>
  );
};

const StyledMenu = styled("div")(({ theme }) => ({
  padding: theme.spacing(2),
  display: "flex",
  alignItems: "center",
  "> a": {
    marginLeft: theme.spacing(2),
    color: theme.palette.text.primary,
    textDecoration: "none",
    borderBottom: `1px solid transparent`,
    ":hover": {
      borderBottom: `1px solid ${theme.palette.text.primary}`,
    },
  },
}));
