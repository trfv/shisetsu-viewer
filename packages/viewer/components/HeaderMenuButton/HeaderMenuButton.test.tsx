import { describe, it, expect } from "vitest";

import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { HeaderMenuButton } from "./HeaderMenuButton";

describe("HeaderMenuButton", () => {
  it("メニューボタンをレンダリングする", async () => {
    await renderWithProviders(<HeaderMenuButton />);
    await expect.element(screen.getByRole("button", { name: "メニュー" })).toBeInTheDocument();
  });

  it("クリックでメニューが開く", async () => {
    const { user } = await renderWithProviders(<HeaderMenuButton />);

    await user.click(screen.getByRole("button", { name: "メニュー" }));

    await expect.element(screen.getByRole("menu", { name: "ナビゲーション" })).toBeInTheDocument();
  });

  it("Escapeキーでメニューが閉じる", async () => {
    const { user } = await renderWithProviders(<HeaderMenuButton />);

    await user.click(screen.getByRole("button", { name: "メニュー" }));
    await expect.element(screen.getByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await expect.element(screen.getByRole("menu")).not.toBeInTheDocument();
  });

  it("anonymousユーザーの場合、予約検索がリンクでなくspanで表示される", async () => {
    const { user } = await renderWithProviders(<HeaderMenuButton />, {
      auth0Config: { userInfo: { anonymous: true, trial: false } },
    });

    await user.click(screen.getByRole("button", { name: "メニュー" }));

    const reservationText = screen.getByText("予約検索");
    await expect.element(reservationText).toBeInTheDocument();
    expect(reservationText.element().tagName).toBe("SPAN");
  });

  it("認証済みユーザーの場合、予約検索がリンクで表示される", async () => {
    const { user } = await renderWithProviders(<HeaderMenuButton />, {
      auth0Config: { userInfo: { anonymous: false, trial: false } },
    });

    await user.click(screen.getByRole("button", { name: "メニュー" }));

    const reservationLink = screen.getByText("予約検索");
    await expect.element(reservationLink).toBeInTheDocument();
    expect(reservationLink.element().tagName).toBe("A");
  });

  it("トライアルユーザーの場合、予約検索にトライアル表示が付く", async () => {
    const { user } = await renderWithProviders(<HeaderMenuButton />, {
      auth0Config: { userInfo: { anonymous: false, trial: true } },
    });

    await user.click(screen.getByRole("button", { name: "メニュー" }));

    await expect.element(screen.getByText("予約検索（トライアル）")).toBeInTheDocument();
  });

  it("施設検索リンクが常に表示される", async () => {
    const { user } = await renderWithProviders(<HeaderMenuButton />);

    await user.click(screen.getByRole("button", { name: "メニュー" }));

    const institutionLink = screen.getByText("施設検索");
    await expect.element(institutionLink).toBeInTheDocument();
    expect(institutionLink.element().tagName).toBe("A");
  });
});
