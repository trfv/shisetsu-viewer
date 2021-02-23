import MuiBox from "@material-ui/core/Box";
import { AutoBox } from "./AutoBox";
import { LargeBox } from "./LargeBox";
import { MediumBox } from "./MediumBox";
import { SmallBox } from "./SmallBox";

export const BaseBox = MuiBox;

export type BoxSize = "small" | "medium" | "large" | "auto";
export const box = (size: BoxSize) => {
  switch (size) {
    case "small":
      return SmallBox;
    case "medium":
      return MediumBox;
    case "large":
      return LargeBox;
    case "auto":
      return AutoBox;
  }
};
