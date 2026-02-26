import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { userEvent } from "vitest/browser";
import { ColorModeProvider, useColorMode } from "./ColorMode";

// Mock useMediaQuery from MUI to control prefers-color-scheme
vi.mock("@mui/material/useMediaQuery", () => ({
  default: vi.fn().mockReturnValue(false),
}));

const STORAGE_KEY = "shisetsu-viewer-color-mode";

// Helper component that reads from the context and exposes values for testing
const ColorModeConsumer = () => {
  const { mode, toggleMode, theme } = useColorMode();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="palette-mode">{theme.palette.mode}</span>
      <button data-testid="toggle" onClick={toggleMode}>
        Toggle
      </button>
    </div>
  );
};

describe("ColorModeProvider", () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  describe("デフォルト状態", () => {
    it("デフォルトモードは'system'である", () => {
      render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      expect(screen.getByTestId("mode").textContent).toBe("system");
    });

    it("子コンポーネントを正しくレンダリングする", () => {
      render(
        <ColorModeProvider>
          <div data-testid="child">Hello</div>
        </ColorModeProvider>
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
      expect(screen.getByTestId("child").textContent).toBe("Hello");
    });
  });

  describe("toggleMode", () => {
    it("system -> light -> dark -> system の順にモードが切り替わる", async () => {
      render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      const toggleButton = screen.getByTestId("toggle");

      // Initial: system
      expect(screen.getByTestId("mode").textContent).toBe("system");

      // system -> light
      await act(async () => {
        await userEvent.click(toggleButton);
      });
      expect(screen.getByTestId("mode").textContent).toBe("light");

      // light -> dark
      await act(async () => {
        await userEvent.click(toggleButton);
      });
      expect(screen.getByTestId("mode").textContent).toBe("dark");

      // dark -> system
      await act(async () => {
        await userEvent.click(toggleButton);
      });
      expect(screen.getByTestId("mode").textContent).toBe("system");
    });
  });

  describe("localStorage永続化", () => {
    it("toggleModeでlocalStorageにモードを保存する", async () => {
      render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      const toggleButton = screen.getByTestId("toggle");

      // Toggle to light
      await act(async () => {
        await userEvent.click(toggleButton);
      });
      expect(localStorage.getItem(STORAGE_KEY)).toBe("light");

      // Toggle to dark
      await act(async () => {
        await userEvent.click(toggleButton);
      });
      expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");

      // Toggle back to system
      await act(async () => {
        await userEvent.click(toggleButton);
      });
      expect(localStorage.getItem(STORAGE_KEY)).toBe("system");
    });

    it("localStorageから初期モードを読み込む", () => {
      localStorage.setItem(STORAGE_KEY, "dark");

      render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      expect(screen.getByTestId("mode").textContent).toBe("dark");
    });

    it("localStorageにlightが保存されている場合、lightで初期化される", () => {
      localStorage.setItem(STORAGE_KEY, "light");

      render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      expect(screen.getByTestId("mode").textContent).toBe("light");
    });

    it("localStorageに無効な値がある場合、systemにフォールバックする", () => {
      localStorage.setItem(STORAGE_KEY, "invalid-mode");

      render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      expect(screen.getByTestId("mode").textContent).toBe("system");
    });
  });

  describe("テーマオブジェクト", () => {
    it("systemモードでprefers-color-schemeがlightの場合、lightテーマを提供する", async () => {
      const useMediaQueryModule = await import("@mui/material/useMediaQuery");
      const mockUseMediaQuery = useMediaQueryModule.default as ReturnType<typeof vi.fn>;
      mockUseMediaQuery.mockReturnValue(false); // prefersDark = false

      render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      expect(screen.getByTestId("palette-mode").textContent).toBe("light");
    });

    it("systemモードでprefers-color-schemeがdarkの場合、darkテーマを提供する", async () => {
      const useMediaQueryModule = await import("@mui/material/useMediaQuery");
      const mockUseMediaQuery = useMediaQueryModule.default as ReturnType<typeof vi.fn>;
      mockUseMediaQuery.mockReturnValue(true); // prefersDark = true

      render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      expect(screen.getByTestId("palette-mode").textContent).toBe("dark");
    });

    it("lightモードではシステム設定に関係なくlightテーマを提供する", async () => {
      const useMediaQueryModule = await import("@mui/material/useMediaQuery");
      const mockUseMediaQuery = useMediaQueryModule.default as ReturnType<typeof vi.fn>;
      mockUseMediaQuery.mockReturnValue(true); // prefersDark = true, but mode is explicit

      localStorage.setItem(STORAGE_KEY, "light");

      render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      expect(screen.getByTestId("mode").textContent).toBe("light");
      expect(screen.getByTestId("palette-mode").textContent).toBe("light");
    });

    it("darkモードではシステム設定に関係なくdarkテーマを提供する", async () => {
      const useMediaQueryModule = await import("@mui/material/useMediaQuery");
      const mockUseMediaQuery = useMediaQueryModule.default as ReturnType<typeof vi.fn>;
      mockUseMediaQuery.mockReturnValue(false); // prefersDark = false, but mode is explicit

      localStorage.setItem(STORAGE_KEY, "dark");

      render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      expect(screen.getByTestId("mode").textContent).toBe("dark");
      expect(screen.getByTestId("palette-mode").textContent).toBe("dark");
    });
  });

  describe("useColorModeフック", () => {
    it("プロバイダーなしではデフォルト値を返す", () => {
      // Context default: mode "system", theme lightTheme
      render(<ColorModeConsumer />);

      expect(screen.getByTestId("mode").textContent).toBe("system");
    });
  });
});
