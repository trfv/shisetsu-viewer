import { grey, indigo, red } from "@material-ui/core/colors";

/** XS: 0px ~ 599px, and so on. */
export const BREAKPOINTS = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
};

export const CONTAINER_WIDTH = BREAKPOINTS.lg;
export const INNER_WIDTH = BREAKPOINTS.lg - 32;

export const COLORS = {
  primary: indigo[500],
  secondary: red[500],
  white: "#ffffff",
  black: "#000000",
  background: grey[100],
};

export const WIDTHS = {
  small: 120,
  medium: 240,
  large: 480,
};
