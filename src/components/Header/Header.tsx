import MuiAppBar from "@material-ui/core/AppBar";
import MuiButton from "@material-ui/core/Button";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import MuiToolbar from "@material-ui/core/Toolbar";
import MuiTypography from "@material-ui/core/Typography";
import React, { FC } from "react";
import { Link } from "react-router-dom";
import { routePath } from "../../constants/routes";

const useStyles = makeStyles((theme) =>
  createStyles({
    appBar: {
      width: "100%",
      minWidth: 1240,
    },
    toolbar: {
      margin: "0 auto",
      width: 1200,
    },
    typography: {
      flexGrow: 1,
    },
    button: {
      marginLeft: theme.spacing(1),
    },
  })
);

export const Header: FC = () => {
  const classes = useStyles();

  return (
    <MuiAppBar className={classes.appBar} position="static">
      <MuiToolbar className={classes.toolbar}>
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
      </MuiToolbar>
    </MuiAppBar>
  );
};
