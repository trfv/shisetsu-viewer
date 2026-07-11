import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getMunicipalityBySlug, getReservationTargets } from "@shisetsu-viewer/shared";

// 各スクレイパーが export する生テキスト → enum 値のマップ。
// 値域が registry の表示ラベル定義と一致していることが viewer 表示の前提になる。
interface ScraperModule {
  scraper?: { municipality?: string };
  DIVISION_MAP?: Record<string, string>;
  STATUS_MAP?: Record<string, string>;
}

const INVALID_VALUES = new Set(["RESERVATION_DIVISION_INVALID", "RESERVATION_STATUS_INVALID"]);

describe("registry contract", () => {
  for (const target of getReservationTargets()) {
    it(`${target}: municipality とマップ値域が registry と整合している`, async () => {
      const mod = (await import(`../${target}/index.ts`)) as ScraperModule;
      const slug = target.slice(target.indexOf("-") + 1);
      const config = getMunicipalityBySlug(slug);
      assert.ok(config, `registry に slug=${slug} の自治体がありません`);

      assert.equal(
        mod.scraper?.municipality,
        target,
        `${target}/index.ts の scraper.municipality がディレクトリ名と一致しません`
      );

      assert.ok(
        mod.DIVISION_MAP,
        `${target}: DIVISION_MAP を export してください（契約テストが参照します）`
      );
      assert.ok(
        mod.STATUS_MAP,
        `${target}: STATUS_MAP を export してください（契約テストが参照します）`
      );

      for (const value of Object.values(mod.DIVISION_MAP)) {
        if (INVALID_VALUES.has(value)) continue;
        assert.ok(
          value in config.reservationDivision,
          `${target}: DIVISION_MAP の値 ${value} が registry の reservationDivision に存在しません（viewer でラベルが引けません）`
        );
      }
      for (const value of Object.values(mod.STATUS_MAP)) {
        if (INVALID_VALUES.has(value)) continue;
        assert.ok(
          value in config.reservationStatus,
          `${target}: STATUS_MAP の値 ${value} が registry の reservationStatus に存在しません（viewer でラベルが引けません）`
        );
      }
    });
  }
});
