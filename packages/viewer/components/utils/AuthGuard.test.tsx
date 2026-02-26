import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { AuthGuard } from "./AuthGuard";

describe("AuthGuard Component", () => {
  it("anonymous=trueかつisLoading=trueの場合にローディングを表示する", () => {
    renderWithProviders(<AuthGuard Component={<div>保護されたページ</div>} />, {
      auth0Config: {
        isLoading: true,
        userInfo: { anonymous: true, trial: false },
      },
    });

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByText("保護されたページ")).not.toBeInTheDocument();
  });

  it("anonymous=trueかつisLoading=falseの場合にトップページへリダイレクトする", () => {
    renderWithProviders(<AuthGuard Component={<div>保護されたページ</div>} />, {
      initialEntries: ["/protected"],
      route: "/protected",
      auth0Config: {
        isLoading: false,
        userInfo: { anonymous: true, trial: false },
      },
    });

    expect(screen.queryByText("保護されたページ")).not.toBeInTheDocument();
  });

  it("anonymous=falseの場合にラップされたComponentをレンダリングする", () => {
    renderWithProviders(<AuthGuard Component={<div>保護されたページ</div>} />, {
      auth0Config: {
        isLoading: false,
        userInfo: { anonymous: false, trial: false },
      },
    });

    expect(screen.getByText("保護されたページ")).toBeInTheDocument();
  });
});
