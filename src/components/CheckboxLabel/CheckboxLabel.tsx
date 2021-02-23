import React, { ComponentProps, FC } from "react";
import { box, BoxSize } from "../Box";
import { Checkbox } from "../Checkbox";
import { SmallLabel } from "../Label";

type Props = {
  label: string;
  size?: BoxSize;
  checkbox: ComponentProps<typeof Checkbox>;
};

export const CheckboxLabel: FC<Props> = ({ label, size = "auto", checkbox }) => {
  const Box = box(size);
  return (
    <Box display="flex" flexDirection="column">
      <SmallLabel label={label} />
      <Checkbox {...checkbox} noLeftMargin={true} />
    </Box>
  );
};
