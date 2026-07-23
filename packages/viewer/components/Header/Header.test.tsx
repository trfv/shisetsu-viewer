import { describe, it, expect, vi } from "vitest";

import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { Header } from "./Header";

const mockUseIsMobile = vi.fn(() => false);

vi.mock("../../hooks/useIsMobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

vi.mock("../../contexts/ColorMode", () => ({
  useColorMode: () => ({ mode: "system" as const, toggleMode: vi.fn(), setMode: vi.fn() }),
}));

describe("Header Component", () => {
  it("ロゴがトップページにリンクされている", async () => {
    mockUseIsMobile.mockReturnValue(false);
    await renderWithProviders(<Header />);

    const logo = screen.getByAltText("Shisetsu Viewer");
    await expect.element(logo).toBeInTheDocument();

    const link = logo.element().closest("a");
    await expect.element(link!).toHaveAttribute("href", "/");
  });

  it("デスクトップで施設検索リンクを表示する", async () => {
    mockUseIsMobile.mockReturnValue(false);
    await renderWithProviders(<Header />);

    const institutionLink = screen.getByText("施設検索");
    await expect.element(institutionLink).toBeInTheDocument();
    await expect
      .element(institutionLink.element().closest("a")!)
      .toHaveAttribute("href", "/institution");
  });

  it("デスクトップで予約検索リンクを表示する", async () => {
    mockUseIsMobile.mockReturnValue(false);
    await renderWithProviders(<Header />, {
      auth0Config: { userInfo: { anonymous: false, trial: false } },
    });

    const reservationLink = screen.getByText("予約検索");
    await expect.element(reservationLink).toBeInTheDocument();
    await expect
      .element(reservationLink.element().closest("a")!)
      .toHaveAttribute("href", "/reservation");
  });

  it("anonymousユーザーの場合、予約検索はリンクではなくspanとして表示される", async () => {
    mockUseIsMobile.mockReturnValue(false);
    await renderWithProviders(<Header />, {
      auth0Config: { userInfo: { anonymous: true, trial: false } },
    });

    const reservationText = screen.getByText("予約検索");
    await expect.element(reservationText).toBeInTheDocument();
    expect(reservationText.element().tagName.toLowerCase()).toBe("span");
    expect(reservationText.element().closest("a")).toBeNull();
  });

  it("trialユーザーの場合、予約検索に（トライアル）が付与される", async () => {
    mockUseIsMobile.mockReturnValue(false);
    await renderWithProviders(<Header />, {
      auth0Config: { userInfo: { anonymous: false, trial: true } },
    });

    await expect.element(screen.getByText("予約検索（トライアル）")).toBeInTheDocument();
  });

  it("モバイルではナビゲーションリンクを表示しない", async () => {
    mockUseIsMobile.mockReturnValue(true);
    await renderWithProviders(<Header />);

    await expect.element(screen.getByText("施設検索")).not.toBeInTheDocument();
  });

  it("モバイルではハンバーガーメニューボタンを表示する", async () => {
    mockUseIsMobile.mockReturnValue(true);
    await renderWithProviders(<Header />);

    await expect.element(screen.getByRole("button", { name: "メニュー" })).toBeInTheDocument();
  });
});
