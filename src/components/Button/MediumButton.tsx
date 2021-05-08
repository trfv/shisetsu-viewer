import React, { ComponentProps } from "react";
import { WIDTHS } from "../../constants/styles";
import { BaseButton } from "./BaseButton";

type Props = ComponentProps<typeof BaseButton>;

export const MediumButton = (props: Props) => (
  <BaseButton {...props} size="small" style={{ width: WIDTHS.medium }} />
);
