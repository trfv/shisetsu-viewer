export { default as CssBaseline } from "@mui/material/CssBaseline";
export { styled, ThemeProvider, useTheme } from "@mui/material/styles";
export { default as useMediaQuery } from "@mui/material/useMediaQuery";
import { grey, indigo, red } from "@mui/material/colors";
import { createTheme, ThemeOptions } from "@mui/material/styles";
import { BREAKPOINTS } from "../constants/styles";

const COLORS = {
  white: "#ffffff",
  black: "#000000",
};

const COMMON_THEME_OPTION: ThemeOptions = {
  typography: {
    fontFamily: 'Roboto, "Noto Sans JP", "Hiragino Sans", Meiryo, sans-serif',
  },
  breakpoints: {
    values: BREAKPOINTS,
  },
};

export const lightTheme = createTheme({
  ...COMMON_THEME_OPTION,
  palette: {
    mode: "light",
    primary: {
      main: indigo[500],
    },
    secondary: {
      main: red[500],
    },
    background: {
      default: grey[50],
      paper: grey[200],
    },
    common: {
      black: COLORS.black,
      white: COLORS.white,
    },
  },
});

export const darkTheme = createTheme({
  ...COMMON_THEME_OPTION,
  palette: {
    mode: "dark",
    primary: {
      main: grey[800],
    },
    secondary: {
      main: grey[500],
    },
    background: {
      default: grey[900],
      paper: grey[800],
    },
    common: {
      black: COLORS.black,
      white: COLORS.white,
    },
  },
});
