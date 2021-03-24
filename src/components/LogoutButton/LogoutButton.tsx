import MuiIconButton from "@material-ui/core/IconButton";
import ExitToAppOutlined from "@material-ui/icons/ExitToAppOutlined";
import React, { FC } from "react";
import { COLORS } from "../../constants/styles";

type Props = {
  onClick: () => void;
};

export const LogoutButton: FC<Props> = ({ onClick }) => (
  <MuiIconButton onClick={onClick}>
    <ExitToAppOutlined fontSize="small" style={{ color: COLORS.WHITE }} />
  </MuiIconButton>
);
