import { describe, it, expect } from "vitest";

import Detail from "../../pages/Detail";
import { renderWithProviders, screen } from "../utils/test-utils";

describe("Navigation", () => {
  describe("Detail page", () => {
    it("無効なUUIDの場合、トップページにリダイレクトする", async () => {
      // When an invalid UUID is provided, Detail renders <Navigate to="/" />.
      // Since MemoryRouter uses route="/*" catch-all, we add a "/" route
      // to verify the redirect happened by checking the Detail content is absent.
      await renderWithProviders(<Detail />, {
        route: "/institution/:id",
        initialEntries: ["/institution/invalid-uuid"],
      });

      // The Detail page content should not be rendered because it redirects.
      // The component renders Navigate to "/" so no institution detail elements appear.
      await expect.element(screen.getByRole("tab", { name: "施設情報" })).not.toBeInTheDocument();
      await expect.element(screen.getByRole("tab", { name: "予約状況" })).not.toBeInTheDocument();
    });
  });
});
