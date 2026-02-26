import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { Header } from "./Header";

const mockUseIsMobile = vi.fn(() => false);

vi.mock("../../hooks/useIsMobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

vi.mock("../../contexts/ColorMode", () => ({
  useColorMode: () => ({ mode: "system" as const, toggleMode: vi.fn() }),
}));

describe("Header Component", () => {
  it("ロゴがトップページにリンクされている", () => {
    mockUseIsMobile.mockReturnValue(false);
    renderWithProviders(<Header />);

    const logo = screen.getByAltText("Shisetsu Viewer");
    expect(logo).toBeInTheDocument();

    const link = logo.closest("a");
    expect(link).toHaveAttribute("href", "/");
  });

  it("デスクトップで施設検索リンクを表示する", () => {
    mockUseIsMobile.mockReturnValue(false);
    renderWithProviders(<Header />);

    const institutionLink = screen.getByText("施設検索");
    expect(institutionLink).toBeInTheDocument();
    expect(institutionLink.closest("a")).toHaveAttribute("href", "/institution");
  });

  it("デスクトップで予約検索リンクを表示する", () => {
    mockUseIsMobile.mockReturnValue(false);
    renderWithProviders(<Header />, {
      auth0Config: { userInfo: { anonymous: false, trial: false } },
    });

    const reservationLink = screen.getByText("予約検索");
    expect(reservationLink).toBeInTheDocument();
    expect(reservationLink.closest("a")).toHaveAttribute("href", "/reservation");
  });

  it("anonymousユーザーの場合、予約検索はリンクではなくspanとして表示される", () => {
    mockUseIsMobile.mockReturnValue(false);
    renderWithProviders(<Header />, {
      auth0Config: { userInfo: { anonymous: true, trial: false } },
    });

    const reservationText = screen.getByText("予約検索");
    expect(reservationText).toBeInTheDocument();
    expect(reservationText.tagName.toLowerCase()).toBe("span");
    expect(reservationText.closest("a")).toBeNull();
  });

  it("trialユーザーの場合、予約検索に（トライアル）が付与される", () => {
    mockUseIsMobile.mockReturnValue(false);
    renderWithProviders(<Header />, {
      auth0Config: { userInfo: { anonymous: false, trial: true } },
    });

    expect(screen.getByText("予約検索（トライアル）")).toBeInTheDocument();
  });

  it("モバイルではナビゲーションリンクを表示しない", () => {
    mockUseIsMobile.mockReturnValue(true);
    renderWithProviders(<Header />);

    expect(screen.queryByText("施設検索")).not.toBeInTheDocument();
  });

  it("モバイルではハンバーガーメニューボタンを表示する", () => {
    mockUseIsMobile.mockReturnValue(true);
    renderWithProviders(<Header />);

    expect(screen.getByLabelText("MenuIcon")).toBeInTheDocument();
  });
});
