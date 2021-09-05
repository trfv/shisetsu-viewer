export { default as CssBaseline } from "@mui/material/CssBaseline";
export { default as useMediaQuery } from "@mui/material/useMediaQuery";
import { grey, indigo, red } from "@mui/material/colors";
import {
  createTheme,
  styled as muiStyled,
  ThemeOptions,
  ThemeProvider as MuiThemeProvider,
} from "@mui/material/styles";

export const styled = muiStyled;
export const ThemeProvider = MuiThemeProvider;

const COLORS = {
  white: "#ffffff",
  black: "#000000",
};

const COMMON_THEME_OPTION: ThemeOptions = {
  typography: {
    fontFamily: 'Roboto, "Noto Sans JP", "Hiragino Sans", Meiryo, sans-serif',
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
