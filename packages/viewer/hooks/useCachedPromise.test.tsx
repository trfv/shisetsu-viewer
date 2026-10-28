import { use } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders, screen } from "../test/utils/test-utils";
import { useCachedPromise } from "./useCachedPromise";

const Item = ({ queryKey, fetcher }: { queryKey: string; fetcher: () => Promise<string> }) => (
  <div>{use(useCachedPromise(queryKey, fetcher))}</div>
);

describe("useCachedPromise", () => {
  it("解決した値を描画する", async () => {
    await renderWithProviders(<Item queryKey="k" fetcher={() => Promise.resolve("Item A")} />);

    await expect.element(screen.getByText("Item A")).toBeInTheDocument();
  });

  it("再描画しても fetcher を呼び直さない", async () => {
    const fetcher = vi.fn(() => Promise.resolve("Item A"));

    const { rerender } = await renderWithProviders(<Item queryKey="k" fetcher={fetcher} />);
    await expect.element(screen.getByText("Item A")).toBeInTheDocument();
    await rerender(<Item queryKey="k" fetcher={fetcher} />);

    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("key が変わると取り直す", async () => {
    const { rerender } = await renderWithProviders(
      <Item queryKey="a" fetcher={() => Promise.resolve("Item A")} />
    );
    await expect.element(screen.getByText("Item A")).toBeInTheDocument();

    await rerender(<Item queryKey="b" fetcher={() => Promise.resolve("Item B")} />);

    await expect.element(screen.getByText("Item B")).toBeInTheDocument();
  });

  it("認証状態の取得中は取得しない", async () => {
    const fetcher = vi.fn(() => Promise.resolve("Item A"));

    await renderWithProviders(<Item queryKey="k" fetcher={fetcher} />, {
      authConfig: { pending: true },
    });

    await expect.element(screen.getByText("Item A")).not.toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
