import { describe, it, expect } from "vitest";

import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { IconButton } from "./IconButton";

describe("IconButton", () => {
  it("正しくレンダリングされる", async () => {
    await renderWithProviders(<IconButton aria-label="テストボタン">X</IconButton>);
    await expect.element(screen.getByRole("button", { name: "テストボタン" })).toBeInTheDocument();
  });
});
