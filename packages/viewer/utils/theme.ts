export { default as CssBaseline } from "@mui/material/CssBaseline";
export { ThemeProvider, styled, useTheme } from "@mui/material/styles";
export { default as useMediaQuery } from "@mui/material/useMediaQuery";
import { createTheme, responsiveFontSizes, type ThemeOptions } from "@mui/material/styles";
import { BREAKPOINTS } from "../constants/styles";

// ─── Slate-Teal Color Tokens ───────────────────────────────────────────────────

export const palette = {
  headerBg: "#2A3544",
  teal: {
    main: "#17706A",
    light: "#4A9E94",
    dark: "#0C4F46",
  },
  tealBright: {
    main: "#4DB8AC",
    light: "#7DD0C6",
    dark: "#2E9387",
  },
  terracotta: {
    main: "#D4785C",
    light: "#E09A82",
    dark: "#B85A3E",
  },
  slate: {
    50: "#F8F9FA",
    100: "#E8ECF0",
    200: "#E2E6EA",
    300: "#94A0AE",
    400: "#4A5C6E",
    500: "#2A3544",
    600: "#1A2332",
    700: "#0F1419",
  },
  white: "#FFFFFF",
  black: "#000000",
};

// ─── Shadows ───────────────────────────────────────────────────────────────────

const lightShadows: ThemeOptions["shadows"] = [
  "none",
  "0 1px 2px rgba(26,35,50,0.06)",
  "0 1px 4px rgba(26,35,50,0.08)",
  "0 2px 6px rgba(26,35,50,0.08)",
  "0 2px 8px rgba(26,35,50,0.10)",
  "0 3px 10px rgba(26,35,50,0.10)",
  "0 4px 12px rgba(26,35,50,0.10)",
  "0 4px 14px rgba(26,35,50,0.12)",
  "0 5px 16px rgba(26,35,50,0.12)",
  "0 6px 18px rgba(26,35,50,0.12)",
  "0 6px 20px rgba(26,35,50,0.14)",
  "0 7px 22px rgba(26,35,50,0.14)",
  "0 8px 24px rgba(26,35,50,0.14)",
  "0 8px 26px rgba(26,35,50,0.15)",
  "0 9px 28px rgba(26,35,50,0.15)",
  "0 10px 30px rgba(26,35,50,0.15)",
  "0 10px 32px rgba(26,35,50,0.16)",
  "0 11px 34px rgba(26,35,50,0.16)",
  "0 12px 36px rgba(26,35,50,0.16)",
  "0 12px 38px rgba(26,35,50,0.17)",
  "0 13px 40px rgba(26,35,50,0.17)",
  "0 14px 42px rgba(26,35,50,0.18)",
  "0 14px 44px rgba(26,35,50,0.18)",
  "0 15px 46px rgba(26,35,50,0.19)",
  "0 16px 48px rgba(26,35,50,0.20)",
];

const darkShadows: ThemeOptions["shadows"] = [
  "none",
  "0 1px 2px rgba(0,0,0,0.20)",
  "0 1px 4px rgba(0,0,0,0.22)",
  "0 2px 6px rgba(0,0,0,0.24)",
  "0 2px 8px rgba(0,0,0,0.26)",
  "0 3px 10px rgba(0,0,0,0.28)",
  "0 4px 12px rgba(0,0,0,0.28)",
  "0 4px 14px rgba(0,0,0,0.30)",
  "0 5px 16px rgba(0,0,0,0.30)",
  "0 6px 18px rgba(0,0,0,0.32)",
  "0 6px 20px rgba(0,0,0,0.32)",
  "0 7px 22px rgba(0,0,0,0.34)",
  "0 8px 24px rgba(0,0,0,0.34)",
  "0 8px 26px rgba(0,0,0,0.36)",
  "0 9px 28px rgba(0,0,0,0.36)",
  "0 10px 30px rgba(0,0,0,0.38)",
  "0 10px 32px rgba(0,0,0,0.38)",
  "0 11px 34px rgba(0,0,0,0.40)",
  "0 12px 36px rgba(0,0,0,0.40)",
  "0 12px 38px rgba(0,0,0,0.42)",
  "0 13px 40px rgba(0,0,0,0.42)",
  "0 14px 42px rgba(0,0,0,0.44)",
  "0 14px 44px rgba(0,0,0,0.44)",
  "0 15px 46px rgba(0,0,0,0.46)",
  "0 16px 48px rgba(0,0,0,0.48)",
];

// ─── Common Theme Options ──────────────────────────────────────────────────────

const commonThemeOptions = (scheme: "light" | "dark"): ThemeOptions => ({
  typography: {
    fontSize: 13,
    fontFamily: '"Noto Sans JP", Roboto, "Hiragino Sans", Meiryo, sans-serif',
    h1: { fontWeight: 700, lineHeight: 1.3 },
    h2: { fontWeight: 700, lineHeight: 1.3 },
    h3: { fontWeight: 600, lineHeight: 1.4 },
    h4: { fontWeight: 600, lineHeight: 1.4 },
    h5: { fontWeight: 600, lineHeight: 1.5 },
    h6: { fontWeight: 600, lineHeight: 1.5 },
    body1: { lineHeight: 1.7 },
    body2: { lineHeight: 1.7 },
    caption: { lineHeight: 1.5 },
    button: { textTransform: "none" as const },
  },
  shape: {
    borderRadius: 8,
  },
  breakpoints: {
    values: BREAKPOINTS,
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 6,
          textTransform: "none" as const,
          fontWeight: 500,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
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
          margin: 0,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head": {
            fontWeight: 600,
            borderBottomWidth: 2,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: "0.875rem",
          padding: "10px 16px",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: "background-color 120ms ease",
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: "3px 3px 0 0",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none" as const,
          fontWeight: 500,
          "&.Mui-selected": {
            fontWeight: 600,
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          "&.Mui-checked": {
            color: scheme === "light" ? palette.teal.main : palette.tealBright.main,
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          boxShadow:
            scheme === "light" ? "4px 0 24px rgba(26,35,50,0.10)" : "4px 0 24px rgba(0,0,0,0.40)",
        },
      },
    },
    MuiCircularProgress: {
      defaultProps: {
        thickness: 3.5,
      },
    },
    MuiSkeleton: {
      defaultProps: {
        animation: "wave",
      },
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          "&:focus": {
            backgroundColor: "transparent",
          },
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: `
        body {
          min-height: 100dvh;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        ul {
          padding-inline-start: 1rem;
          margin-bottom: 1rem;
        }
        ::selection {
          background-color: ${scheme === "light" ? "rgba(27,122,110,0.20)" : "rgba(77,184,172,0.30)"};
        }
      `,
    },
  },
});

// ─── Light Theme ───────────────────────────────────────────────────────────────

export const lightTheme = responsiveFontSizes(
  createTheme({
    ...commonThemeOptions("light"),
    palette: {
      mode: "light",
      primary: {
        main: palette.teal.main,
        light: palette.teal.light,
        dark: palette.teal.dark,
      },
      secondary: {
        main: palette.terracotta.main,
        light: palette.terracotta.light,
        dark: palette.terracotta.dark,
      },
      background: {
        default: palette.slate[100],
        paper: palette.slate[50],
      },
      text: {
        primary: palette.slate[600],
        secondary: palette.slate[400],
      },
      divider: palette.slate[500],
      action: {
        hover: "rgba(27,122,110,0.06)",
      },
      common: {
        black: palette.black,
        white: palette.white,
      },
    },
    shadows: lightShadows,
  })
);

// ─── Dark Theme ────────────────────────────────────────────────────────────────

export const darkTheme = responsiveFontSizes(
  createTheme({
    ...commonThemeOptions("dark"),
    palette: {
      mode: "dark",
      primary: {
        main: palette.tealBright.main,
        light: palette.tealBright.light,
        dark: palette.tealBright.dark,
      },
      secondary: {
        main: palette.terracotta.light,
      },
      background: {
        default: palette.slate[700],
        paper: palette.slate[500],
      },
      text: {
        primary: palette.slate[100],
        secondary: palette.slate[300],
      },
      divider: palette.slate[500],
      action: {
        hover: "rgba(77,184,172,0.10)",
      },
      common: {
        black: palette.black,
        white: palette.white,
      },
    },
    shadows: darkShadows,
  })
);
