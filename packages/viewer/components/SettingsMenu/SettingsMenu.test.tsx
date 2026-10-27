import { describe, expect, it, vi } from "vitest";

import { login, logout } from "../../contexts/Auth";
import { ColorModeProvider } from "../../contexts/ColorMode";
import { renderWithProviders, screen, type AuthMockConfig } from "../../test/utils/test-utils";
import { SettingsMenu } from "./SettingsMenu";

vi.mock("../../contexts/Auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../contexts/Auth")>()),
  login: vi.fn(),
  logout: vi.fn(),
}));

const renderSettingsMenu = (authConfig: AuthMockConfig = {}) =>
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

  it("認証状態の取得中でも歯車ボタンが表示される", async () => {
    await renderSettingsMenu({ pending: true });

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
    it("認証状態の取得中は無効化される", async () => {
      const { user } = await renderSettingsMenu({ pending: true });

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
      const { user } = await renderSettingsMenu({ authenticated: true });

      await user.click(screen.getByRole("button", { name: "設定" }));
      await user.click(screen.getByRole("menuitem", { name: "ログアウト" }));

      expect(logout).toHaveBeenCalledOnce();
      expect(logout).toHaveBeenCalledWith();
    });

    it("未ログインならログインを表示する", async () => {
      const { user } = await renderSettingsMenu({ authenticated: false });

      await user.click(screen.getByRole("button", { name: "設定" }));

      await expect.element(screen.getByRole("menuitem")).toHaveTextContent("ログイン");
    });

    it("ログインをクリックするとloginが呼ばれる", async () => {
      const { user } = await renderSettingsMenu({ authenticated: false });

      await user.click(screen.getByRole("button", { name: "設定" }));
      await user.click(screen.getByRole("menuitem"));

      expect(login).toHaveBeenCalledOnce();
      expect(login).toHaveBeenCalledWith();
    });
  });
});
