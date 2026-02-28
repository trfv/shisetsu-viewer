import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { userEvent } from "vitest/browser";
import { ColorModeProvider, useColorMode } from "./ColorMode";

const STORAGE_KEY = "shisetsu-viewer-color-mode";

// Helper component that reads from the context and exposes values for testing
const ColorModeConsumer = () => {
  const { mode, isDark, toggleMode } = useColorMode();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="is-dark">{isDark ? "dark" : "light"}</span>
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

  describe("テーマ解決", () => {
    it("systemモードでprefers-color-schemeがlightの場合、isDark=false", () => {
      // Default matchMedia returns matches=false (light)
      render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      expect(screen.getByTestId("is-dark").textContent).toBe("light");
    });

    it("lightモードではシステム設定に関係なくisDark=false", () => {
      localStorage.setItem(STORAGE_KEY, "light");

      render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      expect(screen.getByTestId("mode").textContent).toBe("light");
      expect(screen.getByTestId("is-dark").textContent).toBe("light");
    });

    it("darkモードではシステム設定に関係なくisDark=true", () => {
      localStorage.setItem(STORAGE_KEY, "dark");

      render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      expect(screen.getByTestId("mode").textContent).toBe("dark");
      expect(screen.getByTestId("is-dark").textContent).toBe("dark");
    });
  });

  describe("useColorModeフック", () => {
    it("プロバイダーなしではデフォルト値を返す", () => {
      // Context default: mode "system", isDark false
      render(<ColorModeConsumer />);

      expect(screen.getByTestId("mode").textContent).toBe("system");
    });

    it("プロバイダーなしでtoggleModeを呼んでもエラーにならない", async () => {
      render(<ColorModeConsumer />);

      const toggleButton = screen.getByTestId("toggle");
      await act(async () => {
        await userEvent.click(toggleButton);
      });

      // Default toggleMode is a no-op, mode should remain "system"
      expect(screen.getByTestId("mode").textContent).toBe("system");
    });
  });
});
