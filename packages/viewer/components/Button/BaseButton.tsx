import MuiButton, { type ButtonProps } from "@mui/material/Button";
import { AutoButton } from "./AutoButton";
import { LargeButton } from "./LargeButton";
import { MediumButton } from "./MediumButton";
import { SmallButton } from "./SmallButton";
// TODO restrict button usage
export const BaseButton = (props: ButtonProps) => (
  <MuiButton color="inherit" variant="outlined" {...props} />
);

export type ButtonSize = "small" | "medium" | "large" | "auto";

export const button = (size: ButtonSize) => {
  switch (size) {
    case "small":
      return SmallButton;
    case "medium":
      return MediumButton;
    case "large":
      return LargeButton;
    case "auto":
      return AutoButton;
  }
};
