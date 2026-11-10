import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  MUNICIPALITIES,
  RESERVATION_SYSTEMS,
  getAllMunicipalityTargets,
  getMunicipalityKeyByScraperTarget,
  getReservationSystem,
  type Building,
  type ReservationSystemConfig,
} from "@shisetsu-viewer/shared";

import type { InstitutionRecord } from "../tools/backend/types.ts";
import type { ScraperDefinition } from "./defineScraper.ts";

const dataRoot = fileURLToPath(new URL("../data", import.meta.url));

function readData<T>(dir: string, target: string): T[] {
  return JSON.parse(readFileSync(join(dataRoot, dir, `${target}.json`), "utf8")) as T[];
}

const targets = getAllMunicipalityTargets();
const buildingsByTarget = new Map(targets.map((t) => [t, readData<Building>("buildings", t)]));
const allBuildings = [...buildingsByTarget.values()].flat();

async function emittedFacilityNames(target: string): Promise<Set<string>> {
  const { scraper } = (await import(`../${target}/index.ts`)) as {
    scraper: ScraperDefinition<unknown, unknown>;
  };
  return new Set(
    scraper.targets.flatMap((t) => [
      scraper.facility(t),
      ...(scraper.outputs?.([], t) ?? []).map((o) => o.facilityName),
    ])
  );
}

describe("建物マスタ", () => {
  it("建物の id は全自治体で重複しない", () => {
    const ids = allBuildings.map((b) => b.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  for (const target of targets) {
    const municipality = getMunicipalityKeyByScraperTarget(target);

    it(`${target}: 建物は自分の自治体のもので、予約システムも同じ自治体のもの`, () => {
      assert.ok(municipality);
      for (const b of buildingsByTarget.get(target) ?? []) {
        assert.equal(b.municipality, municipality, b.name);
        assert.equal(
          b.prefecture,
          `PREFECTURE_${MUNICIPALITIES[municipality].prefecture.toUpperCase()}`
        );
        if (b.reservation_system === null) continue;
        assert.equal(
          getReservationSystem(b.reservation_system)?.municipality,
          municipality,
          b.name
        );
      }
    });

    it(`${target}: 部屋はすべて同じファイル群の建物を指し、建物はすべて部屋を持つ`, () => {
      const ids = new Set((buildingsByTarget.get(target) ?? []).map((b) => b.id));
      const used = new Set<string>();
      for (const room of readData<InstitutionRecord>("institutions", target)) {
        assert.ok(ids.has(room.building_id), `${room.id} の building_id が見つかりません`);
        used.add(room.building_id);
      }
      assert.deepEqual(
        [...ids].filter((id) => !used.has(id)),
        []
      );
    });
  }

  for (const system of Object.values<ReservationSystemConfig>(RESERVATION_SYSTEMS)) {
    if (!system.scraped) continue;
    it(`${system.key}: 出力する施設名の建物は、この予約システムに属している`, async () => {
      const names = await emittedFacilityNames(system.key);
      for (const b of allBuildings) {
        if (b.municipality !== system.municipality || !names.has(b.system_name)) continue;
        assert.equal(b.reservation_system, system.key, `${b.name} (${b.system_name})`);
      }
    });
  }
});
