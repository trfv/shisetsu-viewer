import { FC } from "react";
import { BaseLabel } from "./BaseLabel";

type Props = {
  label: string;
};

export const LargeLabel: FC<Props> = ({ label }) => {
  return <BaseLabel label={label} fontSize="20px" lineHeight="32px" />;
};
