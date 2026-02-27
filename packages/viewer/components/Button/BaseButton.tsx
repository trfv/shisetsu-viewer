import MuiButton, { type ButtonProps } from "@mui/material/Button";

export const BaseButton = (props: ButtonProps) => (
  <MuiButton color="inherit" variant="outlined" {...props} />
);
