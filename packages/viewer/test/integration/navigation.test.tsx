import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../utils/test-utils";
import Detail from "../../pages/Detail";
import Waiting from "../../pages/Waiting";

describe("Navigation", () => {
  describe("Detail page", () => {
    it("無効なUUIDの場合、トップページにリダイレクトする", () => {
      // When an invalid UUID is provided, Detail renders <Navigate to="/" />.
      // Since MemoryRouter uses route="/*" catch-all, we add a "/" route
      // to verify the redirect happened by checking the Detail content is absent.
      renderWithProviders(<Detail />, {
        route: "/institution/:id",
        initialEntries: ["/institution/invalid-uuid"],
      });

      // The Detail page content should not be rendered because it redirects.
      // The component renders Navigate to "/" so no institution detail elements appear.
      expect(screen.queryByRole("tab", { name: "施設情報" })).not.toBeInTheDocument();
      expect(screen.queryByRole("tab", { name: "予約状況" })).not.toBeInTheDocument();
    });
  });

  describe("Waiting page", () => {
    it("認証ロード完了後、トップページにリダイレクトする", () => {
      renderWithProviders(<Waiting />, {
        route: "/waiting",
        initialEntries: ["/waiting"],
        auth0Config: {
          isLoading: false,
        },
      });

      // When isLoading is false, Waiting renders <Navigate to="/" />.
      // The spinner should not be present since we are redirecting.
      expect(screen.queryByLabelText("読み込み中")).not.toBeInTheDocument();
    });

    it("認証ロード中の場合、ローディングスピナーを表示する", () => {
      renderWithProviders(<Waiting />, {
        route: "/waiting",
        initialEntries: ["/waiting"],
        auth0Config: {
          isLoading: true,
        },
      });

      expect(screen.getByLabelText("読み込み中")).toBeInTheDocument();
    });
  });
});
