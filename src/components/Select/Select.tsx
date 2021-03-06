import MenuItem from "@material-ui/core/MenuItem";
import MuiSelect from "@material-ui/core/Select";
import React, { ChangeEvent, FC } from "react";
import { box, BoxSize } from "../Box";
import { SmallLabel } from "../Label";
import { Spacer } from "../Spacer";

type Props = {
  label: string;
  value: string;
  size?: BoxSize;
  onChange: (event: ChangeEvent<{ value: unknown }>) => void;
  selectOptions: { value: string; label: string }[];
};

export const Select: FC<Props> = ({ label, value, size = "auto", onChange, selectOptions }) => {
  const Box = box(size);
  return (
    <Box component="label" display="flex" flexDirection="column">
      <SmallLabel label={label} />
      <Spacer size={4} axis="vertical" />
      <MuiSelect value={value} onChange={onChange} variant="standard">
        {selectOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </MuiSelect>
    </Box>
  );
};
