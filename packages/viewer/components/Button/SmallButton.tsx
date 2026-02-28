import type { FC } from "react";
import { WIDTHS } from "../../constants/styles";
import { BaseButton, type ButtonProps } from "./BaseButton";

export const SmallButton: FC<ButtonProps> = (props) => (
  <BaseButton {...props} style={{ width: WIDTHS.small, ...props.style }} />
);
