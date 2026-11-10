import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MUNICIPALITIES,
  MUNICIPALITY_KEYS,
  RESERVATION_SYSTEMS,
  getMunicipalityByScraperTarget,
  getMunicipalityBySlug,
  getMunicipalityKeyByScraperTarget,
  getMunicipalityKeyBySlug,
  getReservationTargets,
  getReservationSystem,
  getScraperTargets,
  type ReservationSystemConfig,
} from "./registry.ts";

describe("registry", () => {
  describe("getReservationTargets", () => {
    it("returns only municipalities with reservationExcluded=false in prefecture-slug format", () => {
      const targets = getReservationTargets();

      const expected = [
        "kanagawa-kawasaki",
        "tokyo-adachi",
        "tokyo-katsushika",
        "tokyo-arakawa",
        "tokyo-bunkyo",
        "tokyo-chuo",
        "tokyo-edogawa",
        "tokyo-kita",
        "tokyo-koutou",
        "tokyo-meguro",
        "tokyo-minato",
        "tokyo-ota",
        "tokyo-setagaya",
        "tokyo-shinagawa",
        "tokyo-shinjuku",
        "tokyo-sumida",
        "tokyo-toshima",
      ];

      assert.deepEqual([...targets].sort(), [...expected].sort());
    });

    it("excludes municipalities with reservationExcluded=true", () => {
      const targets = getReservationTargets();
      const excludedSlugs: string[] = ["suginami", "nakano"];

      for (const slug of excludedSlugs) {
        assert.equal(
          targets.some((t) => t.includes(slug)),
          false
        );
      }
    });
  });

  describe("getMunicipalityBySlug", () => {
    it("returns the config for a known slug", () => {
      const result = getMunicipalityBySlug("arakawa");
      assert.ok(result);
      assert.equal(result.label, "荒川区");
    });

    it("returns undefined for unknown slug", () => {
      assert.equal(getMunicipalityBySlug("unknown"), undefined);
    });
  });

  describe("getMunicipalityKeyBySlug", () => {
    it("returns the key for a known slug", () => {
      assert.equal(getMunicipalityKeyBySlug("kawasaki"), "MUNICIPALITY_KAWASAKI");
    });

    it("returns undefined for unknown slug", () => {
      assert.equal(getMunicipalityKeyBySlug("unknown"), undefined);
    });
  });

  describe("getScraperTargets", () => {
    it("自治体単位の target をすべて含む", () => {
      const scraperTargets = getScraperTargets();
      for (const target of getReservationTargets()) {
        assert.ok(scraperTargets.includes(target), `${target} が含まれていません`);
      }
    });

    it("重複を含まない", () => {
      const targets = getScraperTargets();
      assert.equal(new Set(targets).size, targets.length);
    });

    it("reservationExcluded の自治体を含まない", () => {
      assert.equal(
        getScraperTargets().some((t) => t.includes("suginami")),
        false
      );
    });
  });

  describe("getMunicipalityByScraperTarget", () => {
    it("自治体そのものの target を解決する", () => {
      const result = getMunicipalityByScraperTarget("tokyo-kita");
      assert.ok(result);
      assert.equal(result.label, "北区");
    });

    it("未知の target には undefined を返す", () => {
      assert.equal(getMunicipalityByScraperTarget("tokyo-unknown"), undefined);
    });

    it("自治体名の前方一致では解決しない", () => {
      assert.equal(getMunicipalityByScraperTarget("tokyo-kit"), undefined);
    });
  });

  describe("getMunicipalityKeyByScraperTarget", () => {
    it("自治体そのものの target からキーを返す", () => {
      assert.equal(getMunicipalityKeyByScraperTarget("tokyo-kita"), "MUNICIPALITY_KITA");
    });

    it("追加の予約システムの target から親の自治体のキーを返す", () => {
      assert.equal(getMunicipalityKeyByScraperTarget("tokyo-kita-cocokita"), "MUNICIPALITY_KITA");
    });

    it("未知の target には undefined を返す", () => {
      assert.equal(getMunicipalityKeyByScraperTarget("tokyo-unknown"), undefined);
    });
  });

  describe("RESERVATION_SYSTEMS", () => {
    const systems = Object.entries<ReservationSystemConfig>(RESERVATION_SYSTEMS);

    it("key がオブジェクトのキーと一致している", () => {
      for (const [key, system] of systems) {
        assert.equal(system.key, key);
      }
    });

    it("key が自治体の target か、その後ろに名前を足したものになっている", () => {
      for (const [key, system] of systems) {
        const { prefecture, slug } = MUNICIPALITIES[system.municipality];
        const base = `${prefecture}-${slug}`;
        assert.ok(key === base || key.startsWith(`${base}-`), `${key} が ${base} で始まりません`);
      }
    });

    it("自治体の target と同名の予約システムがある", () => {
      for (const key of MUNICIPALITY_KEYS) {
        const { prefecture, slug } = MUNICIPALITIES[key];
        assert.equal(getReservationSystem(`${prefecture}-${slug}`)?.municipality, key);
      }
    });

    it("reservationExcluded の自治体だけが、取得している予約システムを持たない", () => {
      for (const key of MUNICIPALITY_KEYS) {
        const scraped = systems.some(([, s]) => s.municipality === key && s.scraped);
        assert.equal(scraped, !MUNICIPALITIES[key].reservationExcluded, key);
      }
    });

    it("url が https で始まる", () => {
      for (const [key, system] of systems) {
        assert.match(system.url, /^https:\/\//, key);
      }
    });
  });

  describe("getReservationSystem", () => {
    it("Object のプロトタイプの名前では解決しない", () => {
      assert.equal(getReservationSystem("toString"), undefined);
    });
  });
});
