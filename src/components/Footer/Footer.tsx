import { createStyles, makeStyles } from "@material-ui/core/styles";
import { FC } from "react";
import { BaseBox } from "../Box";

const useStyles = makeStyles(() =>
  createStyles({
    appBar: {
      width: "100%",
      minWidth: "1200px",
      top: "auto",
      bottom: 0,
      padding: "16px 0",
      textAlign: "center",
    },
  })
);

export const Footer: FC = () => {
  const classes = useStyles();
  return (
    <BaseBox className={classes.appBar} component="footer">
      Copyright © 2021 trfv All Rights Reserved.
    </BaseBox>
  );
};
