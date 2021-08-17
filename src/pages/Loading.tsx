import { FC } from "react";
import { Spinner } from "../components/Spinner";
import { styled } from "../utils/theme";

export const Loading: FC = () => {
  return (
    <StyledLoading className={classes.main}>
      <Spinner size={60} />
    </StyledLoading>
  );
};

const PREFIX = Loading.displayName;
const classes = {
  main: `${PREFIX}-main`,
};

const StyledLoading = styled("main")(() => ({
  [`&.${classes.main}`]: {
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
