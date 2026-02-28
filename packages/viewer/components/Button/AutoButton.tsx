import type { FC } from "react";
import { BaseButton, type ButtonProps } from "./BaseButton";

export const AutoButton: FC<ButtonProps> = (props) => (
  <BaseButton {...props} style={{ width: "auto", ...props.style }} />
);
