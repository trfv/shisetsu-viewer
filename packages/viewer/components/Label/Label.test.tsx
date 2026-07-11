import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { BaseLabel } from "./BaseLabel";
import { SmallLabel } from "./SmallLabel";

describe("BaseLabel", () => {
  it("ラベルテキストをレンダリングする", () => {
    renderWithProviders(<BaseLabel label="テスト" size="medium" />);
    expect(screen.getByText("テスト")).toBeInTheDocument();
  });

  it("カスタムas propでレンダリングする", () => {
    renderWithProviders(<BaseLabel label="見出し" size="large" as="h2" />);
    const heading = screen.getByText("見出し");
    expect(heading.tagName).toBe("H2");
  });
});

describe("SmallLabel", () => {
  it("正しくレンダリングされる", () => {
    renderWithProviders(<SmallLabel label="小ラベル" />);
    expect(screen.getByText("小ラベル")).toBeInTheDocument();
  });
});
