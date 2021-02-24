import React, { FC } from "react";
import { BaseBox } from "../Box";

type Props = {
  label: string;
  fontSize: string;
  lineHeight: string;
};

export const BaseLabel: FC<Props> = ({ fontSize, label, lineHeight }) => {
  return (
    <BaseBox component="span" display="inline-block" fontSize={fontSize} lineHeight={lineHeight}>
      {label}
    </BaseBox>
  );
};
