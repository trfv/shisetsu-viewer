import { ElementType, FC } from "react";
import { FONT_SIZE } from "../../constants/styles";
import { BaseBox } from "../Box";

type Props = {
  label: string;
  size: LabelSize;
  as?: ElementType;
};

export type LabelSize = "small" | "medium" | "large";

export const BaseLabel: FC<Props> = ({ label, size, as = "span" }) => {
  return (
    <BaseBox component={as} display="inline-block" fontSize={FONT_SIZE[size]}>
      {label}
    </BaseBox>
  );
};
