import FormControl from "@material-ui/core/FormControl";
import MenuItem from "@material-ui/core/MenuItem";
import MuiSelect from "@material-ui/core/Select";
import React, { FC } from "react";
import FormLabel from "../atoms/FormLabel";

type SelectProps = {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<{ value: unknown }>) => void;
  disabled?: boolean;
  selectOptions: { value: string; label: string }[];
};

const Select: FC<SelectProps> = ({
  label,
  value,
  onChange,
  disabled,
  selectOptions,
}: SelectProps) => {
  return (
    <FormControl>
      <FormLabel labelText={label} />
      <MuiSelect value={value} onChange={onChange} disabled={disabled}>
        {selectOptions.map((option, index) => (
          <MenuItem key={index} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </MuiSelect>
    </FormControl>
  );
};

export default Select;
