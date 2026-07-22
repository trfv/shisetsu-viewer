import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { AutoBox } from "./AutoBox";
import { BaseBox } from "./BaseBox";
import { FullBox } from "./FullBox";
import { SmallBox } from "./SmallBox";

describe("BaseBox", () => {
  it("正しくレンダリングされる", async () => {
    await renderWithProviders(<BaseBox data-testid="base-box">テスト</BaseBox>);
    await expect.element(screen.getByTestId("base-box")).toBeInTheDocument();
  });
});

describe("Sized Box variants", () => {
  it("SmallBoxがレンダリングされる", async () => {
    await renderWithProviders(<SmallBox data-testid="small-box">小</SmallBox>);
    await expect.element(screen.getByTestId("small-box")).toBeInTheDocument();
  });

  it("AutoBoxがレンダリングされる", async () => {
    await renderWithProviders(<AutoBox data-testid="auto-box">自動</AutoBox>);
    await expect.element(screen.getByTestId("auto-box")).toBeInTheDocument();
  });

  it("FullBoxがレンダリングされる", async () => {
    await renderWithProviders(<FullBox data-testid="full-box">全幅</FullBox>);
    await expect.element(screen.getByTestId("full-box")).toBeInTheDocument();
  });
});
