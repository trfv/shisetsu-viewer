import { describe, it, expect } from "vitest";

import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { AuthGuard } from "./AuthGuard";

describe("AuthGuard Component", () => {
  it("認証状態の取得中は保護されたページを表示しない", async () => {
    await renderWithProviders(<AuthGuard Component={<div>保護されたページ</div>} />, {
      authConfig: { pending: true },
    });

    await expect.element(screen.getByText("保護されたページ")).not.toBeInTheDocument();
  });

  it("anonymous=trueの場合にトップページへリダイレクトする", async () => {
    await renderWithProviders(<AuthGuard Component={<div>保護されたページ</div>} />, {
      initialEntries: ["/protected"],
      route: "/protected",
      authConfig: {
        userInfo: { anonymous: true, trial: false },
      },
    });

    await expect.element(screen.getByText("保護されたページ")).not.toBeInTheDocument();
  });

  it("anonymous=falseの場合にラップされたComponentをレンダリングする", async () => {
    await renderWithProviders(<AuthGuard Component={<div>保護されたページ</div>} />, {
      authConfig: {
        userInfo: { anonymous: false, trial: false },
      },
    });

    await expect.element(screen.getByText("保護されたページ")).toBeInTheDocument();
  });
});
