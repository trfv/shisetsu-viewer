import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { BaseBox, box } from "./BaseBox";
import { AutoBox } from "./AutoBox";
import { FullBox } from "./FullBox";
import { LargeBox } from "./LargeBox";
import { MediumBox } from "./MediumBox";
import { SmallBox } from "./SmallBox";

describe("BaseBox", () => {
  it("正しくレンダリングされる", () => {
    renderWithProviders(<BaseBox data-testid="base-box">テスト</BaseBox>);
    expect(screen.getByTestId("base-box")).toBeInTheDocument();
  });
});

describe("box factory", () => {
  it("smallサイズでSmallBoxを返す", () => {
    expect(box("small")).toBe(SmallBox);
  });

  it("mediumサイズでMediumBoxを返す", () => {
    expect(box("medium")).toBe(MediumBox);
  });

  it("largeサイズでLargeBoxを返す", () => {
    expect(box("large")).toBe(LargeBox);
  });

  it("autoサイズでAutoBoxを返す", () => {
    expect(box("auto")).toBe(AutoBox);
  });

  it("fullサイズでFullBoxを返す", () => {
    expect(box("full")).toBe(FullBox);
  });
});

describe("Sized Box variants", () => {
  it("SmallBoxがレンダリングされる", () => {
    renderWithProviders(<SmallBox data-testid="small-box">小</SmallBox>);
    expect(screen.getByTestId("small-box")).toBeInTheDocument();
  });

  it("MediumBoxがレンダリングされる", () => {
    renderWithProviders(<MediumBox data-testid="medium-box">中</MediumBox>);
    expect(screen.getByTestId("medium-box")).toBeInTheDocument();
  });

  it("LargeBoxがレンダリングされる", () => {
    renderWithProviders(<LargeBox data-testid="large-box">大</LargeBox>);
    expect(screen.getByTestId("large-box")).toBeInTheDocument();
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
