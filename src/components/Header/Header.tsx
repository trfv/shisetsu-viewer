import { FC } from "react";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { CONTAINER_WIDTH, INNER_WIDTH, WIDTHS } from "../../constants/styles";
import { useAuth0 } from "../../utils/auth0";
import { styled } from "../../utils/theme";
import { BaseBox } from "../Box";
import { LoginButton } from "../LoginButton";
import { ToggleButton } from "../ToggleButton";
import { ToggleButtonGroup } from "../ToggleButtonGroup";

export const Header: FC = () => {
  const location = useLocation();
  const { token } = useAuth0();

  return (
    <StyledHeader className={classes.appBar}>
      <BaseBox className={classes.toolbar}>
        <BaseBox className={classes.toolbarLeft}>
          <BaseBox className={classes.typography} component="h1">
            <Link to={ROUTES.top}>Shisetsu Viewer</Link>
          </BaseBox>
          {token && (
            <ToggleButtonGroup className={classes.toggleButtonGroup}>
              <ToggleButton
                value="reservation"
                className={classes.toggleButton}
                size="small"
                selected={location.pathname === ROUTES.reservation}
                component={Link}
                to={ROUTES.reservation}
                disabled={!token}
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
                disabled={!token}
              >
                施設検索
              </ToggleButton>
            </ToggleButtonGroup>
          )}
        </BaseBox>
        <LoginButton />
      </BaseBox>
    </StyledHeader>
  );
};

const PREFIX = "Header";
const classes = {
  appBar: `${PREFIX}-appBar`,
  toolbar: `${PREFIX}-toolbar`,
  toolbarLeft: `${PREFIX}-toolbarLeft`,
  typography: `${PREFIX}-typography`,
  toggleButtonGroup: `${PREFIX}-toggleButtonGroup`,
  toggleButton: `${PREFIX}-toggleButton`,
};

const StyledHeader = styled("header")(({ theme }) => ({
  [`&.${classes.appBar}`]: {
    width: "100%",
    minWidth: CONTAINER_WIDTH,
    height: 72,
    color: theme.palette.common.white,
    backgroundColor: theme.palette.primary.main,
  },
  [`.${classes.toolbar}`]: {
    margin: "0 auto",
    padding: "16px 0",
    width: INNER_WIDTH,
    display: "flex",
    justifyContent: "space-between",
  },
  [`.${classes.toolbarLeft}`]: {
    display: "flex",
  },
  [`.${classes.typography}`]: {
    margin: 0,
    fontSize: "20px",
    lineHeight: "40px",
    ["> a"]: {
      color: theme.palette.common.white,
      textDecoration: "none",
    },
  },
  [`.${classes.toggleButtonGroup}`]: {
    marginLeft: 24,
  },
  [`.${classes.toggleButton}`]: {
    borderColor: theme.palette.common.white,
    width: WIDTHS.small,
    "&.MuiToggleButton-standard": {
      color: theme.palette.common.white,
    },
    "&.Mui-selected.MuiToggleButton-standard": {
      fontWeight: "bold",
    },
  },
}));
