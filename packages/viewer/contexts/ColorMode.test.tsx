import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { screen } from "../test/utils/test-utils";
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
    it("デフォルトモードは'system'である", async () => {
      await render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      expect(screen.getByTestId("mode").element().textContent).toBe("system");
    });

    it("子コンポーネントを正しくレンダリングする", async () => {
      await render(
        <ColorModeProvider>
          <div data-testid="child">Hello</div>
        </ColorModeProvider>
      );

      await expect.element(screen.getByTestId("child")).toBeInTheDocument();
      expect(screen.getByTestId("child").element().textContent).toBe("Hello");
    });
  });

  describe("toggleMode", () => {
    it("system -> light -> dark -> system の順にモードが切り替わる", async () => {
      await render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      const toggleButton = screen.getByTestId("toggle");

      // Initial: system
      expect(screen.getByTestId("mode").element().textContent).toBe("system");

      // system -> light
      await userEvent.click(toggleButton);
      await expect.element(screen.getByTestId("mode")).toHaveTextContent(/^light$/);

      // light -> dark
      await userEvent.click(toggleButton);
      await expect.element(screen.getByTestId("mode")).toHaveTextContent(/^dark$/);

      // dark -> system
      await userEvent.click(toggleButton);
      await expect.element(screen.getByTestId("mode")).toHaveTextContent(/^system$/);
    });
  });

  describe("localStorage永続化", () => {
    it("toggleModeでlocalStorageにモードを保存する", async () => {
      await render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      const toggleButton = screen.getByTestId("toggle");

      // Toggle to light
      await userEvent.click(toggleButton);
      await vi.waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toBe("light"));

      // Toggle to dark
      await userEvent.click(toggleButton);
      await vi.waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toBe("dark"));

      // Toggle back to system
      await userEvent.click(toggleButton);
      await vi.waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toBe("system"));
    });

    it("localStorageから初期モードを読み込む", async () => {
      localStorage.setItem(STORAGE_KEY, "dark");

      await render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      expect(screen.getByTestId("mode").element().textContent).toBe("dark");
    });

    it("localStorageにlightが保存されている場合、lightで初期化される", async () => {
      localStorage.setItem(STORAGE_KEY, "light");

      await render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      expect(screen.getByTestId("mode").element().textContent).toBe("light");
    });

    it("localStorageに無効な値がある場合、systemにフォールバックする", async () => {
      localStorage.setItem(STORAGE_KEY, "invalid-mode");

      await render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      expect(screen.getByTestId("mode").element().textContent).toBe("system");
    });
  });

  describe("テーマ解決", () => {
    it("systemモードでprefers-color-schemeがlightの場合、isDark=false", async () => {
      // Default matchMedia returns matches=false (light)
      await render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      expect(screen.getByTestId("is-dark").element().textContent).toBe("light");
    });

    it("lightモードではシステム設定に関係なくisDark=false", async () => {
      localStorage.setItem(STORAGE_KEY, "light");

      await render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      expect(screen.getByTestId("mode").element().textContent).toBe("light");
      expect(screen.getByTestId("is-dark").element().textContent).toBe("light");
    });

    it("darkモードではシステム設定に関係なくisDark=true", async () => {
      localStorage.setItem(STORAGE_KEY, "dark");

      await render(
        <ColorModeProvider>
          <ColorModeConsumer />
        </ColorModeProvider>
      );

      expect(screen.getByTestId("mode").element().textContent).toBe("dark");
      expect(screen.getByTestId("is-dark").element().textContent).toBe("dark");
    });
  });

  describe("useColorModeフック", () => {
    it("プロバイダーなしではデフォルト値を返す", async () => {
      // Context default: mode "system", isDark false
      await render(<ColorModeConsumer />);

      expect(screen.getByTestId("mode").element().textContent).toBe("system");
    });

    it("プロバイダーなしでtoggleModeを呼んでもエラーにならない", async () => {
      await render(<ColorModeConsumer />);

      const toggleButton = screen.getByTestId("toggle");
      await userEvent.click(toggleButton);

      // Default toggleMode is a no-op, mode should remain "system"
      expect(screen.getByTestId("mode").element().textContent).toBe("system");
    });
  });
});
