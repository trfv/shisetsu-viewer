import AppBar from "@material-ui/core/AppBar";
import Button from "@material-ui/core/Button";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import React, { FC } from "react";
import { useHistory } from "react-router-dom";
import { routePath } from "../../constants/routes";

const useStyles = makeStyles(() =>
  createStyles({
    title: {
      flexGrow: 1,
    },
  })
);

const Header: FC = () => {
  const classes = useStyles();
  const history = useHistory();
  const navigate = (path: string) => (): void => history.push(path);

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" className={classes.title}>
          Shisetsu Viewer
        </Typography>
        <Button color="inherit" onClick={navigate(routePath.reservation)}>
          予約状況
        </Button>
        <Button color="inherit" onClick={navigate(routePath.search)}>
          施設検索
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
