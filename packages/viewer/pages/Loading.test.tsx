import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../test/utils/test-utils";
import { Loading } from "./Loading";

describe("Loading Page", () => {
  it("Spinnerコンポーネントをレンダリングする", () => {
    renderWithProviders(<Loading />);

    const spinner = screen.getByRole("progressbar");
    expect(spinner).toBeInTheDocument();
  });

  it("main要素内にSpinnerを表示する", () => {
    renderWithProviders(<Loading />);

    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();

    const spinner = screen.getByRole("progressbar");
    expect(main).toContainElement(spinner);
  });
});
