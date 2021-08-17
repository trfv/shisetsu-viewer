import React from 'react'
import { MemoryRouter } from 'react-router-dom';
import { lightTheme as theme, ThemeProvider } from "../src/utils/theme";
import "../src/index.css";

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: { hideNoControlsWarning: true },
}

export const decorators = [
    story => (
      <ThemeProvider theme={theme}>
        <MemoryRouter>{story()}</MemoryRouter>
      </ThemeProvider>
    ),
];
