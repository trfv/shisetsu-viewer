import React, { FC } from "react";
import { BaseLabel } from "./BaseLabel";

type Props = {
  label: string;
};

export const SmallLabel: FC<Props> = ({ label }) => {
  return <BaseLabel label={label} fontSize="12px" lineHeight="16px" />;
};
