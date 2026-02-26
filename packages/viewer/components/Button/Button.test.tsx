import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { BaseButton, button } from "./BaseButton";
import { AutoButton } from "./AutoButton";
import { LargeButton } from "./LargeButton";
import { MediumButton } from "./MediumButton";
import { SmallButton } from "./SmallButton";

describe("BaseButton", () => {
  it("正しくレンダリングされる", () => {
    renderWithProviders(<BaseButton>テスト</BaseButton>);
    expect(screen.getByRole("button", { name: "テスト" })).toBeInTheDocument();
  });
});

describe("button factory", () => {
  it("smallサイズでSmallButtonを返す", () => {
    expect(button("small")).toBe(SmallButton);
  });

  it("mediumサイズでMediumButtonを返す", () => {
    expect(button("medium")).toBe(MediumButton);
  });

  it("largeサイズでLargeButtonを返す", () => {
    expect(button("large")).toBe(LargeButton);
  });

  it("autoサイズでAutoButtonを返す", () => {
    expect(button("auto")).toBe(AutoButton);
  });
});

describe("Sized Button variants", () => {
  it("SmallButtonがレンダリングされる", () => {
    renderWithProviders(<SmallButton>小</SmallButton>);
    expect(screen.getByRole("button", { name: "小" })).toBeInTheDocument();
  });

  it("MediumButtonがレンダリングされる", () => {
    renderWithProviders(<MediumButton>中</MediumButton>);
    expect(screen.getByRole("button", { name: "中" })).toBeInTheDocument();
  });

  it("LargeButtonがレンダリングされる", () => {
    renderWithProviders(<LargeButton>大</LargeButton>);
    expect(screen.getByRole("button", { name: "大" })).toBeInTheDocument();
  });

  it("AutoButtonがレンダリングされる", () => {
    renderWithProviders(<AutoButton>自動</AutoButton>);
    expect(screen.getByRole("button", { name: "自動" })).toBeInTheDocument();
  });
});
