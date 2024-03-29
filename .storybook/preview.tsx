import type { Decorator, Parameters } from "@storybook/react";
import { CssBaseline, darkTheme, lightTheme, ThemeProvider } from "../src/utils/theme";

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
