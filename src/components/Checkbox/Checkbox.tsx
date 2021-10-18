import MuiCheckbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import { ChangeEvent, FC } from "react";
import { box, BoxSize } from "../Box";

type Props = {
  label: string;
  value: string;
  noLeftMargin?: boolean;
  size?: BoxSize;
  /** 以下は CheckboxGroup ではセットしなくて良い */
  checked?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

export const Checkbox: FC<Props> = ({ label, value, size = "auto", checked, onChange }) => {
  const Box = box(size);
  return (
    <Box>
      <FormControlLabel
        control={
          <MuiCheckbox value={value} checked={checked} onChange={onChange} color="default" />
        }
        label={label}
      />
    </Box>
  );
};
