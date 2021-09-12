import { ElementType, FC } from "react";
import { BaseBox } from "../Box";

type Props = {
  label: string;
  size: LabelSize;
  as?: ElementType;
};

export type LabelSize = "small" | "medium" | "large";

// TODO font size の整理
const toFontSize = (size: LabelSize) => {
  switch (size) {
    case "small":
      return 12;
    case "medium":
      return 14;
    case "large":
      return 18;
  }
};

export const BaseLabel: FC<Props> = ({ label, size, as = "span" }) => {
  return (
    <BaseBox component={as} display="inline-block" fontSize={toFontSize(size)}>
      {label}
    </BaseBox>
  );
};
