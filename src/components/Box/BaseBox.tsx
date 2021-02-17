import MuiBox from "@material-ui/core/Box";
import { LargeBox } from "./LargeBox";
import { MiddleBox } from "./MiddleBox";
import { SmallBox } from "./SmallBox";

export const BaseBox = MuiBox;

export type BoxSize = "small" | "middle" | "large";
export const box = (size: BoxSize) => {
  switch (size) {
    case "small":
      return SmallBox;
    case "middle":
      return MiddleBox;
    case "large":
      return LargeBox;
  }
};
