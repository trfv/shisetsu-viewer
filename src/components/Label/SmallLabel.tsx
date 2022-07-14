import type { FC } from "react";
import { BaseLabel } from "./BaseLabel";

type Props = {
  label: string;
};

export const SmallLabel: FC<Props> = ({ label }) => {
  return <BaseLabel label={label} size="small" />;
};
