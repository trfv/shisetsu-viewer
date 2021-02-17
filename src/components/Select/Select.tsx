import MenuItem from "@material-ui/core/MenuItem";
import MuiSelect from "@material-ui/core/Select";
import React, { ChangeEvent, FC } from "react";
import { box, BoxSize } from "../Box";
import { SmallLabel } from "../Label";

type Props = {
  label: string;
  value: string;
  size?: BoxSize;
  onChange: (event: ChangeEvent<{ value: unknown }>) => void;
  selectOptions: { value: string; label: string }[];
};

export const Select: FC<Props> = ({ label, value, size = "middle", onChange, selectOptions }) => {
  const Box = box(size);
  return (
    <Box component="label" display="flex" flexDirection="column">
      <SmallLabel label={label} />
      <MuiSelect value={value} onChange={onChange}>
        {selectOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </MuiSelect>
    </Box>
  );
};
