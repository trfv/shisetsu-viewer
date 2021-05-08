import MuiButton from "@material-ui/core/Button";
import { AutoButton } from "./AutoButton";
import { LargeButton } from "./LargeButton";
import { MediumButton } from "./MediumButton";
import { SmallButton } from "./SmallButton";

export const BaseButton = MuiButton;

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
