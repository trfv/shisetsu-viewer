import { useAuth0 } from "@auth0/auth0-react";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import React, { FC } from "react";
import { useTranslation } from "react-i18next";
import { CONTAINER_WIDTH } from "../../constants/styles";
import { BaseBox } from "../Box";

const useStyles = makeStyles(() =>
  createStyles({
    appBar: {
      width: "100%",
      minWidth: CONTAINER_WIDTH,
      top: "auto",
      bottom: 0,
      padding: "16px 0",
      textAlign: "center",
    },
  })
);

export const Footer: FC = () => {
  const classes = useStyles();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth0();

  if (!isAuthenticated) {
    return null;
  }
  return (
    <BaseBox className={classes.appBar} component="footer">
      {t("Copyright © 2021 trfv All Rights Reserved.")}
    </BaseBox>
  );
};
