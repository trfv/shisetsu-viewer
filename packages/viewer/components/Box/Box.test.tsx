import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { AutoBox } from "./AutoBox";
import { BaseBox } from "./BaseBox";
import { FullBox } from "./FullBox";
import { SmallBox } from "./SmallBox";

describe("BaseBox", () => {
  it("正しくレンダリングされる", () => {
    renderWithProviders(<BaseBox data-testid="base-box">テスト</BaseBox>);
    expect(screen.getByTestId("base-box")).toBeInTheDocument();
  });
});

describe("Sized Box variants", () => {
  it("SmallBoxがレンダリングされる", () => {
    renderWithProviders(<SmallBox data-testid="small-box">小</SmallBox>);
    expect(screen.getByTestId("small-box")).toBeInTheDocument();
  });

  it("AutoBoxがレンダリングされる", () => {
    renderWithProviders(<AutoBox data-testid="auto-box">自動</AutoBox>);
    expect(screen.getByTestId("auto-box")).toBeInTheDocument();
  });

  it("FullBoxがレンダリングされる", () => {
    renderWithProviders(<FullBox data-testid="full-box">全幅</FullBox>);
    expect(screen.getByTestId("full-box")).toBeInTheDocument();
  });
});
