import { useAuth0 } from "@auth0/auth0-react";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import React, { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { COLORS, CONTAINER_WIDTH, INNER_WIDTH } from "../../constants/styles";
import { BaseBox } from "../Box";
import { LogoutButton } from "../LogoutButton";
import { ToggleButton } from "../ToggleButton";
import { ToggleButtonGroup } from "../ToggleButtonGroup";

const useStyles = makeStyles(() =>
  createStyles({
    appBar: {
      width: "100%",
      minWidth: CONTAINER_WIDTH,
      color: COLORS.WHITE,
      backgroundColor: COLORS.PRIMARY,
    },
    toolbar: {
      margin: "0 auto",
      padding: "16px 0",
      width: INNER_WIDTH,
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
      borderColor: COLORS.WHITE,
      "& > *": {
        color: COLORS.WHITE,
        width: 120,
      },
    },
  })
);

export const Header: FC = () => {
  const classes = useStyles();
  const { t } = useTranslation();
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth0();

  return (
    <BaseBox className={classes.appBar} component="header">
      <BaseBox className={classes.toolbar} display="flex">
        <BaseBox className={classes.typography} component="h6">
          Shisetsu Viewer
        </BaseBox>
        {isAuthenticated && (
          <>
            <ToggleButtonGroup className={classes.toggleButtonGroup}>
              <ToggleButton
                value="reservation"
                className={classes.toggleButton}
                size="small"
                selected={location.pathname === ROUTES.reservation}
                component={Link}
                to={ROUTES.reservation}
              >
                {t("予約検索")}
              </ToggleButton>
              <ToggleButton
                value="institution"
                className={classes.toggleButton}
                size="small"
                selected={location.pathname === ROUTES.institution}
                component={Link}
                to={ROUTES.institution}
              >
                {t("施設検索")}
              </ToggleButton>
            </ToggleButtonGroup>
            <LogoutButton
              onClick={() => logout({ returnTo: `${window.location.origin}${ROUTES.root}` })}
            />
          </>
        )}
      </BaseBox>
    </BaseBox>
  );
};
