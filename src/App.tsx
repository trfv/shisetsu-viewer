import AppBar from "@material-ui/core/AppBar";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import React, { FC } from "react";
import Reservation from "./components/pages/Reservation";

const useStyles = makeStyles(() =>
  createStyles({
    title: {
      flexGrow: 1,
    },
  })
);

const App: FC = () => {
  const classes = useStyles();
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" className={classes.title}>
            Shisetsu Viewer
          </Typography>
        </Toolbar>
      </AppBar>
      <Reservation />
    </>
  );
};

export default App;
