import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { IconButton } from "./IconButton";

describe("IconButton", () => {
  it("正しくレンダリングされる", () => {
    renderWithProviders(<IconButton aria-label="テストボタン">X</IconButton>);
    expect(screen.getByRole("button", { name: "テストボタン" })).toBeInTheDocument();
  });
});
