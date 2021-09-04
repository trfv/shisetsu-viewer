import { FC } from "react";
import { CONTAINER_WIDTH } from "../../constants/styles";
import { useAuth0 } from "../../utils/auth0";
import { styled } from "../../utils/theme";

export const Footer: FC = () => {
  const { token } = useAuth0();

  if (!token) {
    return null;
  }

  return (
    <StyledFooter className={classes.appBar}>
      Copyright © 2021 trfv All Rights Reserved.
    </StyledFooter>
  );
};

const PREFIX = "Footer";
const classes = {
  appBar: `${PREFIX}-appBar`,
};

const StyledFooter = styled("footer")(() => ({
  [`&.${classes.appBar}`]: {
    width: "100%",
    minWidth: CONTAINER_WIDTH,
    height: 84,
    top: "auto",
    bottom: 0,
    padding: "32px 0",
    textAlign: "center",
  },
}));
