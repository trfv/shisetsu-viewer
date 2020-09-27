import MuiCheckBox from "@material-ui/core/Checkbox";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import React, { FC } from "react";

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

const CheckBox: FC<CheckboxProps> = ({ label, checked, onChange }) => {
  return (
    <FormControlLabel
      control={<MuiCheckBox checked={checked} onChange={onChange} />}
      label={label}
    />
  );
};

export default CheckBox;
