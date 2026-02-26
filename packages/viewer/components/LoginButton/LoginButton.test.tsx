import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { LoginButton } from "./LoginButton";

vi.mock("../../hooks/useIsMobile", () => ({
  useIsMobile: () => false,
}));

describe("LoginButton Component", () => {
  it("isLoading=trueの場合はnullを返す", () => {
    const { container } = renderWithProviders(<LoginButton />, {
      auth0Config: { isLoading: true },
    });

    expect(container.innerHTML).toBe("");
  });

  it("tokenが存在する場合はログアウトボタンを表示する", () => {
    renderWithProviders(<LoginButton />, {
      auth0Config: { token: "some-token" },
    });

    expect(screen.getByText("ログアウト")).toBeInTheDocument();
  });

  it("ログアウトボタンをクリックするとlogoutが呼ばれる", async () => {
    const logout = vi.fn();
    const { user } = renderWithProviders(<LoginButton />, {
      auth0Config: { token: "some-token", logout },
    });

    await user.click(screen.getByText("ログアウト"));

    expect(logout).toHaveBeenCalledOnce();
    expect(logout).toHaveBeenCalledWith({
      logoutParams: { returnTo: `${location.origin}/` },
    });
  });

  it("tokenが空の場合はログインボタンを表示する", () => {
    renderWithProviders(<LoginButton />, {
      auth0Config: { token: "" },
    });

    expect(screen.getByText("ログイン")).toBeInTheDocument();
  });

  it("ログインボタンをクリックするとloginが呼ばれる", async () => {
    const login = vi.fn();
    const { user } = renderWithProviders(<LoginButton />, {
      auth0Config: { token: "", login },
    });

    await user.click(screen.getByText("ログイン"));

    expect(login).toHaveBeenCalledOnce();
    expect(login).toHaveBeenCalledWith({});
  });
});
