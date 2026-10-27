import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import App from "./App";
import { MockAuthProvider } from "./test/utils/test-utils";

describe("App", () => {
  it("プロバイダ構成を通してヘッダーごとマウントされる", async () => {
    await render(
      <MockAuthProvider>
        <App />
      </MockAuthProvider>
    );
    await expect.element(page.getByRole("banner")).toBeInTheDocument();
  });
});
