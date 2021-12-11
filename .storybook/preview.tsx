import { DecoratorFn } from "@storybook/react";
import { lightTheme as theme, ThemeProvider } from "../src/utils/theme";

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: { hideNoControlsWarning: true },
};

export const decorators: DecoratorFn[] = [
  (Story, ctx) => (
    <ThemeProvider theme={theme}>
      <Story />
    </ThemeProvider>
  ),
];
