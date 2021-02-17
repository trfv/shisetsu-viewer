import { FC } from "react";
import { BaseLabel } from "./BaseLabel";

type Props = {
  label: string;
};

export const MiddleLabel: FC<Props> = ({ label }) => {
  return <BaseLabel label={label} fontSize="16px" lineHeight="24px" />;
};
