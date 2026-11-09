import { describe, it, expect } from "vitest";

import { renderWithProviders, screen } from "../test/utils/test-utils";
import { Loading } from "./Loading";

describe("Loading Page", () => {
  it("読み込み中のバーを表示する", async () => {
    await renderWithProviders(<Loading />);

    const bar = screen.getByRole("progressbar");
    await expect.element(bar).toBeInTheDocument();
  });

  it("main要素内にバーを表示する", async () => {
    await renderWithProviders(<Loading />);

    const main = screen.getByRole("main");
    await expect.element(main).toBeInTheDocument();

    const bar = screen.getByRole("progressbar");
    await expect.element(main).toContainElement(bar.element());
  });
});
