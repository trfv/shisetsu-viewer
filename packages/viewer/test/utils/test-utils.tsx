import { render, RenderOptions, RenderResult } from "@testing-library/react";
import { ReactElement, ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import userEvent from "@testing-library/user-event";

// Mock Auth0 provider
const MockAuth0Provider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialEntries?: string[];
  route?: string;
  mocks?: MockedResponse[];
  auth0Config?: {
    isAuthenticated?: boolean;
    user?: unknown;
    isLoading?: boolean;
    loginWithRedirect?: () => void;
    logout?: () => void;
  };
  theme?: ReturnType<typeof createTheme>;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    initialEntries = ["/"],
    route = "/*",
    mocks = [],
    theme = createTheme(),
    ...renderOptions
  }: CustomRenderOptions = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const user = userEvent.setup();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MockedProvider mocks={mocks} addTypename={false} showWarnings={false}>
        <MockAuth0Provider>
          <ThemeProvider theme={theme}>
            <MemoryRouter initialEntries={initialEntries}>
              <Routes>
                <Route path={route} element={children} />
              </Routes>
            </MemoryRouter>
          </ThemeProvider>
        </MockAuth0Provider>
      </MockedProvider>
    );
  }

  return {
    user,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Re-export everything from testing library
export * from "@testing-library/react";
export { userEvent };

// Custom queries
export const getByDataTestId = (container: HTMLElement, id: string) => {
  return container.querySelector(`[data-testid="${id}"]`);
};

// Wait utilities
export const waitForLoadingToFinish = async () => {
  const { waitFor } = await import("@testing-library/react");
  await waitFor(() => {
    const loadingElements = document.querySelectorAll('[aria-busy="true"]');
    expect(loadingElements).toHaveLength(0);
  });
};
