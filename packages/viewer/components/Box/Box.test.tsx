import { describe, it, expect } from "vitest";

import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { BaseBox } from "./BaseBox";
import { FullBox } from "./FullBox";

describe("BaseBox", () => {
  it("正しくレンダリングされる", async () => {
    await renderWithProviders(<BaseBox data-testid="base-box">テスト</BaseBox>);
    await expect.element(screen.getByTestId("base-box")).toBeInTheDocument();
  });
});

describe("Sized Box variants", () => {
  it("FullBoxがレンダリングされる", async () => {
    await renderWithProviders(<FullBox data-testid="full-box">全幅</FullBox>);
    await expect.element(screen.getByTestId("full-box")).toBeInTheDocument();
  });
});
