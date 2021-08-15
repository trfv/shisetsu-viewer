import { ComponentProps } from "react";
import { WIDTHS } from "../../constants/styles";
import { BaseButton } from "./BaseButton";

type Props = ComponentProps<typeof BaseButton>;

export const LargeButton = (props: Props) => (
  <BaseButton {...props} size="small" style={{ width: WIDTHS.large }} />
);
