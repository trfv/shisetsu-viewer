import { MemoryRouter } from "react-router-dom";
import "../src/index.css";
import { lightTheme as theme, ThemeProvider } from "../src/utils/theme";

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: { hideNoControlsWarning: true },
};

export const decorators = [
  (story) => (
    <ThemeProvider theme={theme}>
      <MemoryRouter>{story()}</MemoryRouter>
    </ThemeProvider>
  ),
];
