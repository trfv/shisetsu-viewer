import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getMunicipalityBySlug,
  getMunicipalityKeyBySlug,
  getReservationTargets,
} from "./registry.ts";

describe("registry", () => {
  describe("getReservationTargets", () => {
    it("returns only municipalities with reservationExcluded=false in prefecture-slug format", () => {
      const targets = getReservationTargets();

      const expected = [
        "kanagawa-kawasaki",
        "tokyo-arakawa",
        "tokyo-bunkyo",
        "tokyo-chuo",
        "tokyo-edogawa",
        "tokyo-kita",
        "tokyo-koutou",
        "tokyo-meguro",
        "tokyo-ota",
        "tokyo-sumida",
        "tokyo-toshima",
      ];

      assert.deepEqual([...targets].sort(), [...expected].sort());
    });

    it("excludes municipalities with reservationExcluded=true", () => {
      const targets = getReservationTargets();
      const excludedSlugs: string[] = ["suginami"];

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
});
