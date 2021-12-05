import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { CONTAINER_WIDTH, HEADER_HEIGHT } from "../../constants/styles";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useAuth0 } from "../../utils/auth0";
import { styled } from "../../utils/theme";
import { BaseBox } from "../Box";
import { HeaderMenuButton } from "../HeaderMenuButton";
import { LoginButton } from "../LoginButton";

export const Header = () => {
  const isMobile = useIsMobile();
  const { token } = useAuth0();

  return (
    <StyledHeader className={classes.appBar}>
      <BaseBox className={classes.toolbar}>
        {isMobile && (
          <BaseBox className={classes.menuButton}>{token && <HeaderMenuButton />}</BaseBox>
        )}
        <BaseBox className={classes.logoAndMenu}>
          <BaseBox className={classes.logoWrapper} component="h1">
            <Link to={ROUTES.top}>
              <img className={classes.logo} src="/logo.svg" alt="Shisetsu Viewer" />
            </Link>
          </BaseBox>
          {!isMobile && token && (
            <BaseBox className={classes.menu}>
              <Link to={ROUTES.reservation}>予約検索</Link>
              <Link to={ROUTES.institution}>施設検索</Link>
            </BaseBox>
          )}
        </BaseBox>
        <BaseBox className={classes.menuButton}>
          <LoginButton />
        </BaseBox>
      </BaseBox>
    </StyledHeader>
  );
};

const PREFIX = "Header";
const classes = {
  appBar: `${PREFIX}-appBar`,
  toolbar: `${PREFIX}-toolbar`,
  logoAndMenu: `${PREFIX}-logoAndMenu`,
  logoWrapper: `${PREFIX}-logoWrapper`,
  logo: `${PREFIX}-logo`,
  menu: `${PREFIX}-menu`,
  menuButton: `${PREFIX}-menuButton`,
};

const StyledHeader = styled("header")(({ theme }) => ({
  [`&.${classes.appBar}`]: {
    width: "100%",
    height: HEADER_HEIGHT,
    color: theme.palette.common.white,
    backgroundColor: theme.palette.primary.main,
  },
  [`.${classes.toolbar}`]: {
    marginInline: "auto",
    padding: theme.spacing(2, 0),
    maxWidth: CONTAINER_WIDTH,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(2, 1),
    },
  },
  [`.${classes.logoAndMenu}`]: {
    height: 40,
    display: "flex",
    a: {
      color: theme.palette.common.white,
      textDecoration: "none",
    },
  },
  [`.${classes.logoWrapper}`]: {
    margin: 0,
  },
  [`.${classes.logo}`]: {
    height: 40,
  },
  [`.${classes.menu}`]: {
    display: "flex",
    alignItems: "center",
    "> a": {
      marginLeft: theme.spacing(3),
      borderBottom: `1px solid transparent`,
      ":hover": {
        borderColor: theme.palette.common.white,
      },
    },
  },
  [`.${classes.menuButton}`]: {
    minWidth: 40, // icon size
  },
}));
