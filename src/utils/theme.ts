import { createMuiTheme } from "@material-ui/core/styles";
import { jaJP } from "../constants/datagrid";
import { BREAKPOINTS, COLORS } from "../constants/styles";

export const theme = createMuiTheme(
  {
    shape: {
      borderRadius: 4,
    },
    breakpoints: {
      values: BREAKPOINTS,
    },
    palette: {
      primary: {
        main: COLORS.primary,
        contrastText: COLORS.white,
      },
      secondary: {
        main: COLORS.secondary,
        contrastText: COLORS.white,
      },
      background: {
        default: COLORS.background,
      },
      common: {
        black: COLORS.black,
        white: COLORS.white,
      },
    },
  },
  jaJP
);
