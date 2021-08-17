import { grey, indigo, red } from "@material-ui/core/colors";
import {
  createTheme,
  styled as muiStyled,
  ThemeOptions,
  ThemeProvider as MuiThemeProvider,
} from "@material-ui/core/styles";
import { jaJP } from "../constants/datagrid";
import { BREAKPOINTS } from "../constants/styles";

export const styled = muiStyled;
export const ThemeProvider = MuiThemeProvider;

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
  typography: {
    fontFamily: 'Roboto, "Noto Sans JP", "Hiragino Sans", Meiryo, sans-serif',
  },
};

export const lightTheme = createTheme(
  {
    ...COMMON_THEME_OPTION,
    palette: {
      mode: "light",
      primary: {
        main: indigo[500],
        contrastText: COLORS.white,
      },
      secondary: {
        main: red[500],
        contrastText: COLORS.white,
      },
      background: {
        default: grey[50],
      },
      common: {
        black: COLORS.black,
        white: COLORS.white,
      },
    },
  },
  jaJP
);

export const darkTheme = createTheme(
  {
    ...COMMON_THEME_OPTION,
    palette: {
      mode: "dark",
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
