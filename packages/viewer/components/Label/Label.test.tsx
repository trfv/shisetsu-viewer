import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { BaseLabel } from "./BaseLabel";
import { SmallLabel } from "./SmallLabel";

describe("BaseLabel", () => {
  it("ラベルテキストをレンダリングする", async () => {
    await renderWithProviders(<BaseLabel label="テスト" size="medium" />);
    await expect.element(screen.getByText("テスト")).toBeInTheDocument();
  });

  it("カスタムas propでレンダリングする", async () => {
    await renderWithProviders(<BaseLabel label="見出し" size="large" as="h2" />);
    const heading = screen.getByText("見出し");
    expect(heading.element().tagName).toBe("H2");
  });
});

describe("SmallLabel", () => {
  it("正しくレンダリングされる", async () => {
    await renderWithProviders(<SmallLabel label="小ラベル" />);
    await expect.element(screen.getByText("小ラベル")).toBeInTheDocument();
  });
});
