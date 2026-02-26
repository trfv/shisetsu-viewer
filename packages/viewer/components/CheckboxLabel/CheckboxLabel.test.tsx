import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { CheckboxLabel } from "./CheckboxLabel";

describe("CheckboxLabel", () => {
  it("ラベルとチェックボックスをレンダリングする", () => {
    renderWithProviders(
      <CheckboxLabel label="テスト項目" checkbox={{ label: "オプションA", value: "a" }} />
    );
    expect(screen.getByText("テスト項目")).toBeInTheDocument();
    expect(screen.getByText("オプションA")).toBeInTheDocument();
  });

  it("カスタムサイズでレンダリングする", () => {
    renderWithProviders(
      <CheckboxLabel
        label="サイズテスト"
        size="medium"
        checkbox={{ label: "オプションB", value: "b" }}
      />
    );
    expect(screen.getByText("サイズテスト")).toBeInTheDocument();
  });
});
