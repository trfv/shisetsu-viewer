import { grey, indigo, red } from "@material-ui/core/colors";
import { createMuiTheme, ThemeOptions } from "@material-ui/core/styles";
import { jaJP } from "../constants/datagrid";
import { BREAKPOINTS } from "../constants/styles";

const COLORS = {
  white: "#ffffff",
  black: "#000000",
};

const COMMON_THEME_OPTION: ThemeOptions = {
  shape: {
    borderRadius: 4,
  },
  breakpoints: {
    values: BREAKPOINTS,
  },
  // overrides: {
  //   MuiCssBaseline: {
  //     "@global": {
  //       "*::-webkit-scrollbar": {
  //         display: "none", // https://github.com/mui-org/material-ui-x/issues/1613
  //       },
  //     },
  //   },
  // },
};

export const lightTheme = createMuiTheme(
  {
    ...COMMON_THEME_OPTION,
    palette: {
      ...COMMON_THEME_OPTION.palette,
      type: "light",
      primary: {
        main: indigo[500],
        contrastText: COLORS.white,
      },
      secondary: {
        main: red[500],
        contrastText: COLORS.white,
      },
      background: {
        default: grey[100],
      },
      common: {
        black: COLORS.black,
        white: COLORS.white,
      },
    },
  },
  jaJP
);

export const darkTheme = createMuiTheme(
  {
    ...COMMON_THEME_OPTION,
    palette: {
      type: "dark",
      primary: {
        main: grey[800],
        contrastText: COLORS.white,
      },
      secondary: {
        main: grey[500],
        contrastText: COLORS.white,
      },
      common: {
        black: COLORS.black,
        white: COLORS.white,
      },
    },
  },
  jaJP
);
