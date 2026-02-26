import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { HeaderMenuButton } from "./HeaderMenuButton";

describe("HeaderMenuButton", () => {
  it("メニューアイコンボタンをレンダリングする", () => {
    renderWithProviders(<HeaderMenuButton />);
    expect(screen.getByLabelText("MenuIcon")).toBeInTheDocument();
  });

  it("anonymousユーザーの場合、予約検索がリンクでなくspanで表示される", async () => {
    const { user } = renderWithProviders(<HeaderMenuButton />, {
      auth0Config: { userInfo: { anonymous: true, trial: false } },
    });

    await user.click(screen.getByLabelText("MenuIcon"));

    // anonymous user sees non-clickable "予約検索"
    const reservationText = await screen.findByText("予約検索");
    expect(reservationText.tagName).toBe("SPAN");
  });

  it("認証済みユーザーの場合、予約検索がリンクで表示される", async () => {
    const { user } = renderWithProviders(<HeaderMenuButton />, {
      auth0Config: { userInfo: { anonymous: false, trial: false } },
    });

    await user.click(screen.getByLabelText("MenuIcon"));

    const reservationLink = await screen.findByText("予約検索");
    expect(reservationLink.tagName).toBe("A");
  });

  it("トライアルユーザーの場合、予約検索にトライアル表示が付く", async () => {
    const { user } = renderWithProviders(<HeaderMenuButton />, {
      auth0Config: { userInfo: { anonymous: false, trial: true } },
    });

    await user.click(screen.getByLabelText("MenuIcon"));

    const reservationLink = await screen.findByText("予約検索（トライアル）");
    expect(reservationLink).toBeInTheDocument();
  });

  it("施設検索リンクが常に表示される", async () => {
    const { user } = renderWithProviders(<HeaderMenuButton />);

    await user.click(screen.getByLabelText("MenuIcon"));

    const institutionLink = await screen.findByText("施設検索");
    expect(institutionLink.tagName).toBe("A");
  });
});
