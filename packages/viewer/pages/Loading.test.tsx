import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../test/utils/test-utils";
import { Loading } from "./Loading";

describe("Loading Page", () => {
  it("Spinnerコンポーネントをレンダリングする", async () => {
    await renderWithProviders(<Loading />);

    const spinner = screen.getByRole("progressbar");
    await expect.element(spinner).toBeInTheDocument();
  });

  it("main要素内にSpinnerを表示する", async () => {
    await renderWithProviders(<Loading />);

    const main = screen.getByRole("main");
    await expect.element(main).toBeInTheDocument();

    const spinner = screen.getByRole("progressbar");
    await expect.element(main).toContainElement(spinner.element());
  });
});
