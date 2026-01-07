import MenuItem from "@mui/material/MenuItem";
import MuiSelect, { type SelectChangeEvent as MuiSelectChangeEvent } from "@mui/material/Select";
import type { FC } from "react";
import { box, type BoxSize } from "../Box";
import { SmallLabel } from "../Label";
import { Spacer } from "../Spacer";

export type SelectChangeEvent<T> = MuiSelectChangeEvent<T>;

type Props = {
  label: string;
  value: string;
  size?: BoxSize;
  onChange: (event: SelectChangeEvent<string>) => void;
  selectOptions: { value: string; label: string }[];
};

export const Select: FC<Props> = ({ label, value, size = "auto", onChange, selectOptions }) => {
  const Box = box(size);
  return (
    // eslint-disable-next-line react-hooks/static-components
    <Box component="label" display="flex" flexDirection="column">
      <SmallLabel label={label} />
      <Spacer axis="vertical" size={4} />
      <MuiSelect
        aria-label={label}
        inputProps={{ "aria-label": label }}
        onChange={onChange}
        value={value}
        variant="standard"
      >
        {selectOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </MuiSelect>
    </Box>
  );
};
