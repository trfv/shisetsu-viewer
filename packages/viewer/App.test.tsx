import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { Auth0Context } from "./contexts/Auth0";

const auth0Value = {
  isLoading: false,
  token: "mock-token",
  userInfo: { anonymous: false, trial: false },
  login: vi.fn(),
  logout: vi.fn(),
};

describe("App", () => {
  it("プロバイダ構成を通してヘッダーごとマウントされる", async () => {
    await render(
      <Auth0Context.Provider value={auth0Value}>
        <App />
      </Auth0Context.Provider>
    );
    // App は自前の Router を持つため二重ラップしない。ヘッダー（banner）が
    // 描画されれば ErrorBoundary/ColorModeProvider/Router/Header の合成が成立している。
    await expect.element(page.getByRole("banner")).toBeInTheDocument();
  });
});
