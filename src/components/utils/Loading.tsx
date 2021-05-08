import CircularProgress from "@material-ui/core/CircularProgress";
import { makeStyles } from "@material-ui/core/styles";
import React, { FC } from "react";

const useStyles = makeStyles(() => ({
  main: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
  },
}));

export const Loading: FC = () => {
  const classes = useStyles();
  return (
    <div className={classes.main}>
      <CircularProgress size={60} />
    </div>
  );
};
