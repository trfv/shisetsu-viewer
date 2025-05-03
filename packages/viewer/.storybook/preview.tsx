import type { Decorator, Parameters } from "@storybook/react";
import React from "react";
import { CssBaseline, darkTheme, lightTheme, ThemeProvider } from "../utils/theme";

export const parameters: Parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: { hideNoControlsWarning: true },
};

export const decorators: Decorator[] = [
  (Story, context) => (
    <ThemeProvider
      theme={context.globals.backgrounds?.value === "#333333" ? darkTheme : lightTheme}
    >
      <CssBaseline />
      <Story />
    </ThemeProvider>
  ),
];
