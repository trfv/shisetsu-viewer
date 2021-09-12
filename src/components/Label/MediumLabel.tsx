import { FC } from "react";
import { BaseLabel } from "./BaseLabel";

type Props = {
  label: string;
};

export const MediumLabel: FC<Props> = ({ label }) => {
  return <BaseLabel label={label} size="medium" />;
};
