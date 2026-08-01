import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import App from "./App";
import { AuthContext } from "./contexts/Auth";

const authValue = {
  isLoading: false,
  authenticated: true,
  userInfo: { anonymous: false, trial: false },
  login: vi.fn(),
  logout: vi.fn(),
};

describe("App", () => {
  it("プロバイダ構成を通してヘッダーごとマウントされる", async () => {
    await render(
      <AuthContext.Provider value={authValue}>
        <App />
      </AuthContext.Provider>
    );
    // App は自前の Router を持つため二重ラップしない。ヘッダー（banner）が
    // 描画されれば ErrorBoundary/ColorModeProvider/Router/Header の合成が成立している。
    await expect.element(page.getByRole("banner")).toBeInTheDocument();
  });
});
