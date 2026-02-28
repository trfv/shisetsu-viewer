import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { Spinner } from "./Spinner";

describe("Spinner Component", () => {
  it("正しくレンダリングされる", () => {
    renderWithProviders(<Spinner />);

    const spinner = screen.getByRole("progressbar");
    expect(spinner).toBeInTheDocument();
  });

  it("適切なaria-label属性を持つ", () => {
    renderWithProviders(<Spinner />);

    const spinner = screen.getByRole("progressbar");
    expect(spinner).toHaveAttribute("aria-label", "読み込み中");
  });

  it("sizeプロパティを受け取れる", () => {
    renderWithProviders(<Spinner size={60} />);

    const spinner = screen.getByRole("progressbar");
    expect(spinner).toBeInTheDocument();
  });
});
