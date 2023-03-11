export { default as CssBaseline } from "@mui/material/CssBaseline";
export { styled, ThemeProvider, useTheme } from "@mui/material/styles";
export { default as useMediaQuery } from "@mui/material/useMediaQuery";
import { grey, indigo, red } from "@mui/material/colors";
import { createTheme, responsiveFontSizes, ThemeOptions } from "@mui/material/styles";
import { BREAKPOINTS } from "../constants/styles";

const COLORS = {
  white: "#ffffff",
  black: "#000000",
};

const commonThemeOptions = (scheme: "light" | "dark"): ThemeOptions => ({
  typography: {
    fontSize: 12, // https://mui.com/customization/typography/#font-size
    fontFamily: 'Roboto, "Noto Sans JP", "Hiragino Sans", Meiryo, sans-serif',
  },
  breakpoints: {
    values: BREAKPOINTS,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          color: "inherit",
        },
      },
    },
    MuiInput: {
      styleOverrides: {
        root: {
          fontSize: "1rem",
          colorScheme: scheme,
        },
      },
    },
    MuiInputAdornment: {
      styleOverrides: {
        root: {
          margin: 0, // 存在しない時にも margin が発生してしまっているので上書きする
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          fontSize: "1rem",
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: `
        body {
          min-height: 100dvh;
        }
        ul {
          padding-inline-start: 1rem;
          margin-bottom: 1rem;
        }
      `,
    },
  },
});

export const lightTheme = responsiveFontSizes(
  createTheme({
    ...commonThemeOptions("light"),
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
  })
);

export const darkTheme = responsiveFontSizes(
  createTheme({
    ...commonThemeOptions("dark"),
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
  })
);
