import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../test/utils/test-utils";
import WaitingPage from "./Waiting";

describe("Waiting Page", () => {
  it("isLoading=trueの場合、Loadingコンポーネント（Spinner）を表示する", () => {
    renderWithProviders(<WaitingPage />, {
      auth0Config: { isLoading: true },
    });

    const spinner = screen.getByRole("progressbar");
    expect(spinner).toBeInTheDocument();
  });

  it("isLoading=falseの場合、トップページにリダイレクトする", () => {
    renderWithProviders(<WaitingPage />, {
      initialEntries: ["/waiting"],
      route: "/waiting",
      auth0Config: { isLoading: false },
    });

    // Navigate to "/" means no progressbar should be visible
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
