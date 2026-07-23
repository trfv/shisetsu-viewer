import { describe, it, expect } from "vitest";

import { AuthGuard } from "../../components/utils/AuthGuard";
import { renderWithProviders, screen } from "../utils/test-utils";

describe("Authentication Flow", () => {
  describe("AuthGuard", () => {
    it("匿名ユーザーの場合、保護されたコンテンツを表示しない", async () => {
      await renderWithProviders(<AuthGuard Component={<div>Protected Content</div>} />, {
        auth0Config: {
          isLoading: false,
          userInfo: { anonymous: true, trial: false },
        },
      });

      await expect.element(screen.getByText("Protected Content")).not.toBeInTheDocument();
    });

    it("認証済みユーザーの場合、保護されたコンテンツを表示する", async () => {
      await renderWithProviders(<AuthGuard Component={<div>Protected Content</div>} />, {
        auth0Config: {
          isLoading: false,
          userInfo: { anonymous: false, trial: false },
        },
      });

      await expect.element(screen.getByText("Protected Content")).toBeInTheDocument();
    });
  });
});
