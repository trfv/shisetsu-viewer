import { describe, expect, it } from "vitest";

import { ReservationDivision, ReservationStatus } from "../../constants/enums";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { getNewlyVacantDivisions } from "../../utils/reservation";
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

  it("新しく空いた区分に NEW を付ける。午前①②のような分割区分にも付く", async () => {
    await renderWithProviders(
      <ReservationStatusList
        municipality="MUNICIPALITY_KOUTOU"
        newlyVacantDivisions={getNewlyVacantDivisions({
          is_morning_newly_vacant: true,
          is_afternoon_newly_vacant: false,
          is_evening_newly_vacant: false,
        })}
        reservation={{
          [ReservationDivision.MORNING_ONE]: ReservationStatus.VACANT,
          [ReservationDivision.MORNING_TWO]: ReservationStatus.VACANT,
          [ReservationDivision.EVENING]: ReservationStatus.VACANT,
        }}
      />
    );

    const items = document.querySelectorAll("li");
    expect([...items].map((li) => li.textContent)).toEqual(["①空きNEW", "②空きNEW", "夜間空き"]);
  });
});
