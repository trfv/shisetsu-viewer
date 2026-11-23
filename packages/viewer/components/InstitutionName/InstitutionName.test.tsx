import { describe, expect, it, vi } from "vitest";

import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { InstitutionName } from "./InstitutionName";

const BUILDING_ID = "5d8f2a1e-3c4b-4e6f-9a7b-1c2d3e4f5a6b";

describe("InstitutionName", () => {
  it("地区・建物・部屋を空白でつなぎ、建物名を建物ページへのリンクにする", async () => {
    await renderWithProviders(
      <p>
        <InstitutionName
          building="テスト文化センター"
          buildingId={BUILDING_ID}
          institution="音楽練習室A"
          municipality="MUNICIPALITY_KOUTOU"
        />
      </p>
    );

    await expect
      .element(screen.getByText("江東区 テスト文化センター 音楽練習室A"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: "テスト文化センター" }))
      .toHaveAttribute("href", `/building/${BUILDING_ID}`);
  });

  it("建物 id が無ければ建物名をリンクにしない", async () => {
    await renderWithProviders(
      <p>
        <InstitutionName
          building="テスト文化センター"
          buildingId={null}
          institution="音楽練習室A"
          municipality="MUNICIPALITY_KOUTOU"
        />
      </p>
    );

    await expect
      .element(screen.getByText("江東区 テスト文化センター 音楽練習室A"))
      .toBeInTheDocument();
    await expect.element(screen.getByRole("link")).not.toBeInTheDocument();
  });

  it("建物名を押しても外側のクリックに伝えない", async () => {
    const onOuterClick = vi.fn();
    const { user } = await renderWithProviders(
      // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div onClick={onOuterClick}>
        <InstitutionName
          building="テスト文化センター"
          buildingId={BUILDING_ID}
          institution="音楽練習室A"
          municipality="MUNICIPALITY_KOUTOU"
        />
      </div>
    );

    await user.click(screen.getByRole("link", { name: "テスト文化センター" }));

    expect(onOuterClick).not.toHaveBeenCalled();
  });
});
