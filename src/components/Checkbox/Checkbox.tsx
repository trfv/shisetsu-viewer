import MuiCheckbox from "@material-ui/core/Checkbox";
import React, { ChangeEvent, FC } from "react";
import { box, BoxSize } from "../Box";
import { MediumLabel } from "../Label";

type Props = {
  label: string;
  value: string;
  noLeftMargin?: boolean;
  size?: BoxSize;
  /** 以下は CheckboxGroup ではセットしなくて良い */
  checked?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

export const Checkbox: FC<Props> = ({
  label,
  value,
  noLeftMargin,
  size = "auto",
  checked,
  onChange,
}) => {
  const Box = box(size);
  return (
    <Box
      component="label"
      display="flex"
      alignItems="center"
      marginLeft={noLeftMargin ? "-12px" : "0px"}
    >
      <MuiCheckbox value={value} checked={checked} onChange={onChange} />
      <MediumLabel label={label} />
    </Box>
  );
};
