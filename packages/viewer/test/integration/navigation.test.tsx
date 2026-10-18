import { describe, it, expect } from "vitest";

import Detail from "../../pages/Detail";
import { renderWithProviders, screen } from "../utils/test-utils";

describe("Navigation", () => {
  describe("Detail page", () => {
    it("無効なUUIDの場合、トップページにリダイレクトする", async () => {
      await renderWithProviders(<Detail />, {
        route: "/institution/:id",
        initialEntries: ["/institution/invalid-uuid"],
      });

      await expect.element(screen.getByRole("tab", { name: "施設情報" })).not.toBeInTheDocument();
      await expect.element(screen.getByRole("tab", { name: "予約状況" })).not.toBeInTheDocument();
    });
  });
});
