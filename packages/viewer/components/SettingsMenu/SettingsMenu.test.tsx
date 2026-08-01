import { describe, expect, it, vi } from "vitest";

import { ColorModeProvider } from "../../contexts/ColorMode";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { SettingsMenu } from "./SettingsMenu";

const renderSettingsMenu = (authConfig = {}) =>
  renderWithProviders(
    <ColorModeProvider>
      <SettingsMenu />
    </ColorModeProvider>,
    { authConfig }
  );

describe("SettingsMenu", () => {
  it("歯車ボタンが常にレンダリングされる", async () => {
    await renderSettingsMenu();

    await expect.element(screen.getByRole("button", { name: "設定" })).toBeInTheDocument();
  });

  it("isLoading中でも歯車ボタンが表示される", async () => {
    await renderSettingsMenu({ isLoading: true });

    await expect.element(screen.getByRole("button", { name: "設定" })).toBeInTheDocument();
  });

  it("クリックでメニューが開く", async () => {
    const { user } = await renderSettingsMenu();

    await user.click(screen.getByRole("button", { name: "設定" }));

    await expect.element(screen.getByRole("menu", { name: "設定メニュー" })).toBeInTheDocument();
  });

  it("再クリックでメニューが閉じる", async () => {
    const { user } = await renderSettingsMenu();

    await user.click(screen.getByRole("button", { name: "設定" }));
    await expect.element(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "設定" }));
    await expect.element(screen.getByRole("menu")).not.toBeInTheDocument();
  });

  it("Escapeキーでメニューが閉じる", async () => {
    const { user } = await renderSettingsMenu();

    await user.click(screen.getByRole("button", { name: "設定" }));
    await expect.element(screen.getByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await expect.element(screen.getByRole("menu")).not.toBeInTheDocument();
  });

  describe("カラーモード", () => {
    it("3つのモード選択肢が表示される", async () => {
      const { user } = await renderSettingsMenu();

      await user.click(screen.getByRole("button", { name: "設定" }));

      await expect
        .element(screen.getByRole("menuitemradio", { name: "システム設定" }))
        .toBeInTheDocument();
      await expect
        .element(screen.getByRole("menuitemradio", { name: "ライト" }))
        .toBeInTheDocument();
      await expect
        .element(screen.getByRole("menuitemradio", { name: "ダーク" }))
        .toBeInTheDocument();
    });

    it("デフォルトでシステム設定がアクティブ", async () => {
      const { user } = await renderSettingsMenu();

      await user.click(screen.getByRole("button", { name: "設定" }));

      await expect
        .element(screen.getByRole("menuitemradio", { name: "システム設定" }))
        .toHaveAttribute("aria-checked", "true");
    });
  });

  describe("ログイン/ログアウト", () => {
    it("isLoading中は無効化される", async () => {
      const { user } = await renderSettingsMenu({ isLoading: true });

      await user.click(screen.getByRole("button", { name: "設定" }));

      const authItem = screen.getByRole("menuitem", { name: "読み込み中..." });
      await expect.element(authItem).toBeDisabled();
      await expect.element(authItem).toHaveTextContent("読み込み中...");
    });

    it("ログイン済みならログアウトを表示する", async () => {
      const { user } = await renderSettingsMenu({ authenticated: true });

      await user.click(screen.getByRole("button", { name: "設定" }));

      await expect
        .element(screen.getByRole("menuitem", { name: "ログアウト" }))
        .toBeInTheDocument();
    });

    it("ログアウトをクリックするとlogoutが呼ばれる", async () => {
      const logout = vi.fn();
      const { user } = await renderSettingsMenu({ authenticated: true, logout });

      await user.click(screen.getByRole("button", { name: "設定" }));
      await user.click(screen.getByRole("menuitem", { name: "ログアウト" }));

      // BFF 化により戻り先の指定は不要になった。logout は引数を取らない。
      expect(logout).toHaveBeenCalledOnce();
      expect(logout).toHaveBeenCalledWith();
    });

    it("未ログインならログインを表示する", async () => {
      const { user } = await renderSettingsMenu({ authenticated: false });

      await user.click(screen.getByRole("button", { name: "設定" }));

      await expect.element(screen.getByRole("menuitem")).toHaveTextContent("ログイン");
    });

    it("ログインをクリックするとloginが呼ばれる", async () => {
      const login = vi.fn();
      const { user } = await renderSettingsMenu({ authenticated: false, login });

      await user.click(screen.getByRole("button", { name: "設定" }));
      await user.click(screen.getByRole("menuitem"));

      expect(login).toHaveBeenCalledOnce();
      expect(login).toHaveBeenCalledWith();
    });
  });
});
