import { useAuth0 } from "@auth0/auth0-react";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import React, { FC } from "react";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { CONTAINER_WIDTH, INNER_WIDTH, WIDTHS } from "../../constants/styles";
import { BaseBox } from "../Box";
import { LogoutButton } from "../LogoutButton";
import { ToggleButton } from "../ToggleButton";
import { ToggleButtonGroup } from "../ToggleButtonGroup";

const useStyles = makeStyles(({ palette }) =>
  createStyles({
    appBar: {
      width: "100%",
      minWidth: CONTAINER_WIDTH,
      color: palette.common.white,
      backgroundColor: palette.primary.main,
    },
    toolbar: {
      margin: "0 auto",
      padding: "16px 0",
      width: INNER_WIDTH,
      display: "flex",
    },
    typography: {
      margin: 0,
      fontSize: "20px",
      lineHeight: "40px",
      flexGrow: 1,
    },
    toggleButtonGroup: {
      flexGrow: 0,
      marginRight: 8,
    },
    toggleButton: {
      borderColor: palette.common.white,
      "& > *": {
        color: palette.common.white,
        width: WIDTHS.small,
      },
    },
  })
);

export const Header: FC = () => {
  const classes = useStyles();
  const location = useLocation();
  const { isAuthenticated } = useAuth0();

  return (
    <BaseBox className={classes.appBar} component="header">
      <BaseBox className={classes.toolbar}>
        <BaseBox className={classes.typography} component="h1">
          Shisetsu Viewer
        </BaseBox>
        {isAuthenticated && (
          <ToggleButtonGroup className={classes.toggleButtonGroup}>
            <ToggleButton
              value="reservation"
              className={classes.toggleButton}
              size="small"
              selected={location.pathname === ROUTES.reservation}
              component={Link}
              to={ROUTES.reservation}
              disabled={!isAuthenticated}
            >
              予約検索
            </ToggleButton>
            <ToggleButton
              value="institution"
              className={classes.toggleButton}
              size="small"
              selected={location.pathname === ROUTES.institution}
              component={Link}
              to={ROUTES.institution}
              disabled={!isAuthenticated}
            >
              施設検索
            </ToggleButton>
          </ToggleButtonGroup>
        )}
        <LogoutButton />
      </BaseBox>
    </BaseBox>
  );
};
