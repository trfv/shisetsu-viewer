import { describe, expect, it } from "vitest";

import { ReservationDivision, ReservationStatus } from "../../constants/enums";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { ReservationStatusList } from "./ReservationStatusList";

describe("ReservationStatusList", () => {
  it("区分を午前・午後・夜間の順に、区分名とステータスの組で並べる", async () => {
    await renderWithProviders(
      <ReservationStatusList
        municipality="MUNICIPALITY_KOUTOU"
        reservation={{
          [ReservationDivision.EVENING]: ReservationStatus.VACANT,
          [ReservationDivision.MORNING]: ReservationStatus.STATUS_1,
          [ReservationDivision.AFTERNOON]: ReservationStatus.VACANT,
        }}
      />
    );

    const items = document.querySelectorAll("li");
    expect([...items].map((li) => li.textContent)).toEqual([
      "午前予約あり",
      "午後空き",
      "夜間空き",
    ]);
  });

  it("空きの区分だけを強調する", async () => {
    await renderWithProviders(
      <ReservationStatusList
        municipality="MUNICIPALITY_KOUTOU"
        reservation={{
          [ReservationDivision.MORNING]: ReservationStatus.VACANT,
          [ReservationDivision.AFTERNOON]: ReservationStatus.STATUS_1,
        }}
      />
    );

    const [morning, afternoon] = document.querySelectorAll("li");
    expect(morning?.className).toContain("vacant");
    expect(afternoon?.className).not.toContain("vacant");
  });

  it("施設単位の区分ラベルを優先する", async () => {
    await renderWithProviders(
      <ReservationStatusList
        divisionLabels={{ [ReservationDivision.MORNING]: "9:00-11:45" }}
        municipality="MUNICIPALITY_KITA"
        reservation={{ [ReservationDivision.MORNING]: ReservationStatus.VACANT }}
      />
    );

    await expect.element(screen.getByText("9:00-11:45")).toBeInTheDocument();
  });
});
