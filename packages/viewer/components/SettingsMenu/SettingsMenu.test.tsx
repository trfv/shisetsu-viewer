import { describe, expect, it, vi } from "vitest";
import { ColorModeProvider } from "../../contexts/ColorMode";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { SettingsMenu } from "./SettingsMenu";

const renderSettingsMenu = (auth0Config = {}) =>
  renderWithProviders(
    <ColorModeProvider>
      <SettingsMenu />
    </ColorModeProvider>,
    { auth0Config }
  );

describe("SettingsMenu", () => {
  it("歯車ボタンが常にレンダリングされる", () => {
    renderSettingsMenu();

    expect(screen.getByRole("button", { name: "設定" })).toBeInTheDocument();
  });

  it("isLoading中でも歯車ボタンが表示される", () => {
    renderSettingsMenu({ isLoading: true });

    expect(screen.getByRole("button", { name: "設定" })).toBeInTheDocument();
  });

  it("クリックでメニューが開く", async () => {
    const { user } = renderSettingsMenu();

    await user.click(screen.getByRole("button", { name: "設定" }));

    expect(screen.getByRole("menu", { name: "設定メニュー" })).toBeInTheDocument();
  });

  it("再クリックでメニューが閉じる", async () => {
    const { user } = renderSettingsMenu();

    await user.click(screen.getByRole("button", { name: "設定" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "設定" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("Escapeキーでメニューが閉じる", async () => {
    const { user } = renderSettingsMenu();

    await user.click(screen.getByRole("button", { name: "設定" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  describe("カラーモード", () => {
    it("3つのモード選択肢が表示される", async () => {
      const { user } = renderSettingsMenu();

      await user.click(screen.getByRole("button", { name: "設定" }));

      expect(screen.getByRole("menuitemradio", { name: "システム設定" })).toBeInTheDocument();
      expect(screen.getByRole("menuitemradio", { name: "ライト" })).toBeInTheDocument();
      expect(screen.getByRole("menuitemradio", { name: "ダーク" })).toBeInTheDocument();
    });

    it("デフォルトでシステム設定がアクティブ", async () => {
      const { user } = renderSettingsMenu();

      await user.click(screen.getByRole("button", { name: "設定" }));

      expect(screen.getByRole("menuitemradio", { name: "システム設定" })).toHaveAttribute(
        "aria-checked",
        "true"
      );
    });
  });

  describe("ログイン/ログアウト", () => {
    it("isLoading中は無効化される", async () => {
      const { user } = renderSettingsMenu({ isLoading: true });

      await user.click(screen.getByRole("button", { name: "設定" }));

      const authItem = screen.getByRole("menuitem");
      expect(authItem).toBeDisabled();
      expect(authItem).toHaveTextContent("読み込み中...");
    });

    it("tokenありの場合はログアウトを表示する", async () => {
      const { user } = renderSettingsMenu({ token: "some-token" });

      await user.click(screen.getByRole("button", { name: "設定" }));

      expect(screen.getByRole("menuitem")).toHaveTextContent("ログアウト");
    });

    it("ログアウトをクリックするとlogoutが呼ばれる", async () => {
      const logout = vi.fn();
      const { user } = renderSettingsMenu({ token: "some-token", logout });

      await user.click(screen.getByRole("button", { name: "設定" }));
      await user.click(screen.getByRole("menuitem"));

      expect(logout).toHaveBeenCalledOnce();
      expect(logout).toHaveBeenCalledWith({
        logoutParams: { returnTo: `${location.origin}/` },
      });
    });

    it("tokenなしの場合はログインを表示する", async () => {
      const { user } = renderSettingsMenu({ token: "" });

      await user.click(screen.getByRole("button", { name: "設定" }));

      expect(screen.getByRole("menuitem")).toHaveTextContent("ログイン");
    });

    it("ログインをクリックするとloginが呼ばれる", async () => {
      const login = vi.fn();
      const { user } = renderSettingsMenu({ token: "", login });

      await user.click(screen.getByRole("button", { name: "設定" }));
      await user.click(screen.getByRole("menuitem"));

      expect(login).toHaveBeenCalledOnce();
      expect(login).toHaveBeenCalledWith({});
    });
  });
});
