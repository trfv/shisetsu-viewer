import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { AuthGuard } from "./AuthGuard";
import { ROUTES } from "../../constants/routes";

// Mock the Auth0 context
const mockUseAuth0 = vi.fn();
vi.mock("../../contexts/Auth0", () => ({
  useAuth0: () => mockUseAuth0(),
}));

// Mock the Loading component
vi.mock("../../pages/Loading", () => ({
  Loading: () => <div data-testid="loading">Loading...</div>,
}));

const theme = createTheme();

const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

const renderAuthGuard = (initialEntries: string[] = ["/protected"]) => {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/" element={<div data-testid="top-page">Top Page</div>} />
          <Route path="/protected" element={<AuthGuard Component={<TestComponent />} />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when user is authenticated", () => {
    it("renders the protected component", () => {
      mockUseAuth0.mockReturnValue({
        isLoading: false,
        userInfo: { anonymous: false, trial: false },
      });

      renderAuthGuard();

      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });

    it("renders the protected component for trial users", () => {
      mockUseAuth0.mockReturnValue({
        isLoading: false,
        userInfo: { anonymous: false, trial: true },
      });

      renderAuthGuard();

      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    });
  });

  describe("when user is anonymous and loading", () => {
    it("shows loading state", () => {
      mockUseAuth0.mockReturnValue({
        isLoading: true,
        userInfo: { anonymous: true, trial: false },
      });

      renderAuthGuard();

      expect(screen.getByTestId("loading")).toBeInTheDocument();
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });
  });

  describe("when user is anonymous and not loading", () => {
    it("redirects to top page", () => {
      mockUseAuth0.mockReturnValue({
        isLoading: false,
        userInfo: { anonymous: true, trial: false },
      });

      renderAuthGuard();

      expect(screen.getByTestId("top-page")).toBeInTheDocument();
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("does not show loading state", () => {
      mockUseAuth0.mockReturnValue({
        isLoading: false,
        userInfo: { anonymous: true, trial: false },
      });

      renderAuthGuard();

      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });
  });

  describe("redirect behavior", () => {
    it("redirects to the correct route (ROUTES.top)", () => {
      mockUseAuth0.mockReturnValue({
        isLoading: false,
        userInfo: { anonymous: true, trial: false },
      });

      // Verify ROUTES.top is "/"
      expect(ROUTES.top).toBe("/");

      renderAuthGuard();

      // Should be on top page after redirect
      expect(screen.getByTestId("top-page")).toBeInTheDocument();
    });
  });

  describe("loading state transitions", () => {
    it("transitions from loading to authenticated", () => {
      // Start with loading
      mockUseAuth0.mockReturnValue({
        isLoading: true,
        userInfo: { anonymous: true, trial: false },
      });

      const { rerender } = render(
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={["/protected"]}>
            <Routes>
              <Route path="/" element={<div data-testid="top-page">Top Page</div>} />
              <Route path="/protected" element={<AuthGuard Component={<TestComponent />} />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      );

      expect(screen.getByTestId("loading")).toBeInTheDocument();

      // Transition to authenticated
      mockUseAuth0.mockReturnValue({
        isLoading: false,
        userInfo: { anonymous: false, trial: false },
      });

      rerender(
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={["/protected"]}>
            <Routes>
              <Route path="/" element={<div data-testid="top-page">Top Page</div>} />
              <Route path="/protected" element={<AuthGuard Component={<TestComponent />} />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      );

      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });
  });
});
