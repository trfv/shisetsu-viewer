import { describe, it, expect } from "vitest";
import { renderWithProviders } from "../../test/utils/test-utils";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("正しくレンダリングされる", () => {
    const { container } = renderWithProviders(<Skeleton width={200} height={20} />);
    const skeleton = container.querySelector(".MuiSkeleton-root");
    expect(skeleton).toBeInTheDocument();
  });
});
