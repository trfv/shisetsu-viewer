import React from 'react'
import { MemoryRouter } from 'react-router-dom';

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: { hideNoControlsWarning: true },
}

export const decorators = [
    story => (
      <MemoryRouter>{story()}</MemoryRouter>
    ),
];
