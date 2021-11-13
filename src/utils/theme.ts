export { default as CssBaseline } from "@mui/material/CssBaseline";
export { styled, ThemeProvider, useTheme } from "@mui/material/styles";
export { default as useMediaQuery } from "@mui/material/useMediaQuery";
import { grey, indigo, red } from "@mui/material/colors";
import { createTheme, responsiveFontSizes, ThemeOptions } from "@mui/material/styles";
import { BREAKPOINTS } from "../constants/styles";
import NotoSansJpBold from "../fonts/noto-sans-jp-v28-latin_japanese-700.woff2";
import NotoSansJpRegular from "../fonts/noto-sans-jp-v28-latin_japanese-regular.woff2";
import RobotoBold from "../fonts/roboto-v27-latin-700.woff2";
import RobotoRegular from "../fonts/roboto-v27-latin-regular.woff2";

const COLORS = {
  white: "#ffffff",
  black: "#000000",
};

const COMMON_THEME_OPTION: ThemeOptions = {
  typography: {
    fontSize: 12, // https://mui.com/customization/typography/#font-size
    fontFamily: 'Roboto, "Noto Sans JP", "Hiragino Sans", Meiryo, sans-serif',
  },
  breakpoints: {
    values: BREAKPOINTS,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        html {
          height: -webkit-fill-available;
        }
        body {
          min-height: 100vh;
          min-height: -webkit-fill-available;
        }
        @font-face {
          font-family: "Roboto";
          font-style: normal;
          font-weight: 400;
          font-display: swap;
          src: local("Roboto"), url(${RobotoRegular}) format("woff2"); 
        }
        @font-face {
          font-family: "Roboto";
          font-style: normal;
          font-weight: 700;
          font-display: swap;
          src: local("Roboto"), url(${RobotoBold}) format("woff2"); 
        }
        @font-face {
          font-family: "Noto Sans JP";
          font-style: normal;
          font-weight: 400;
          font-display: swap;
          src: local("Noto Sans JP"), url(${NotoSansJpRegular}) format("woff2"); 
        }
        @font-face {
          font-family: "Noto Sans JP";
          font-style: normal;
          font-weight: 700;
          font-display: swap;
          src: local("Noto Sans JP"), url(${NotoSansJpBold}) format("woff2"); 
        }
      `,
    },
  },
};

export const lightTheme = responsiveFontSizes(
  createTheme({
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
  })
);

export const darkTheme = responsiveFontSizes(
  createTheme({
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
  })
);
