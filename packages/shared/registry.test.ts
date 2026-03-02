import { describe, expect, it } from "vitest";
import {
  getReservationTargets,
  getMunicipalityBySlug,
  getMunicipalityKeyBySlug,
} from "./registry.ts";

describe("registry", () => {
  describe("getReservationTargets", () => {
    it("returns only municipalities with reservationExcluded=false in prefecture-slug format", () => {
      const targets = getReservationTargets();

      // Must match the hardcoded list in scraper tools exactly
      const expected = [
        "kanagawa-kawasaki",
        "tokyo-arakawa",
        "tokyo-chuo",
        "tokyo-kita",
        "tokyo-koutou",
        "tokyo-sumida",
      ];

      expect([...targets].sort()).toEqual([...expected].sort());
    });

    it("excludes municipalities with reservationExcluded=true", () => {
      const targets = getReservationTargets();
      const excludedSlugs = ["bunkyo", "toshima", "edogawa", "ota", "suginami"];

      for (const slug of excludedSlugs) {
        expect(targets.some((t) => t.includes(slug))).toBe(false);
      }
    });
  });

  describe("getMunicipalityBySlug", () => {
    it("returns the config for a known slug", () => {
      const result = getMunicipalityBySlug("arakawa");
      expect(result).toBeDefined();
      expect(result?.label).toBe("荒川区");
    });

    it("returns undefined for unknown slug", () => {
      expect(getMunicipalityBySlug("unknown")).toBeUndefined();
    });
  });

  describe("getMunicipalityKeyBySlug", () => {
    it("returns the key for a known slug", () => {
      expect(getMunicipalityKeyBySlug("kawasaki")).toBe("MUNICIPALITY_KAWASAKI");
    });

    it("returns undefined for unknown slug", () => {
      expect(getMunicipalityKeyBySlug("unknown")).toBeUndefined();
    });
  });
});
