import MuiButton from "@material-ui/core/Button";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import MuiTypography from "@material-ui/core/Typography";
import React, { FC } from "react";
import { Link } from "react-router-dom";
import { routePath } from "../../constants/routes";
import { BaseBox } from "../Box";

const useStyles = makeStyles((theme) =>
  createStyles({
    appBar: {
      width: "100%",
      minWidth: "1200px",
      color: theme.palette.primary.contrastText,
      backgroundColor: theme.palette.primary.main,
    },
    toolbar: {
      margin: "0 auto",
      width: "1200px",
      padding: "16px 0",
    },
    typography: {
      flexGrow: 1,
    },
    button: {
      flexGrow: 0,
      marginLeft: "16px",
    },
  })
);

export const Header: FC = () => {
  const classes = useStyles();

  return (
    <BaseBox className={classes.appBar} component="header">
      <BaseBox className={classes.toolbar} display="flex">
        <MuiTypography variant="h6" className={classes.typography}>
          Shisetsu Viewer
        </MuiTypography>
        <MuiButton
          className={classes.button}
          variant="outlined"
          color="inherit"
          component={Link}
          to={routePath.reservation}
        >
          予約状況
        </MuiButton>
        <MuiButton
          className={classes.button}
          variant="outlined"
          color="inherit"
          component={Link}
          to={routePath.institution}
        >
          施設検索
        </MuiButton>
      </BaseBox>
    </BaseBox>
  );
};
