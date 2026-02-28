import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../utils/test-utils";
import { AuthGuard } from "../../components/utils/AuthGuard";

describe("Authentication Flow", () => {
  describe("AuthGuard", () => {
    it("匿名ユーザーの場合、保護されたコンテンツを表示しない", () => {
      renderWithProviders(<AuthGuard Component={<div>Protected Content</div>} />, {
        auth0Config: {
          isLoading: false,
          userInfo: { anonymous: true, trial: false },
        },
      });

      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });

    it("認証済みユーザーの場合、保護されたコンテンツを表示する", () => {
      renderWithProviders(<AuthGuard Component={<div>Protected Content</div>} />, {
        auth0Config: {
          isLoading: false,
          userInfo: { anonymous: false, trial: false },
        },
      });

      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
  });
});
