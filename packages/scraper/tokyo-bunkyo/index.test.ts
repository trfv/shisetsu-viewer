import { test } from "@playwright/test";
import { addDays, addMonths, differenceInWeeks, endOfMonth, format } from "date-fns";
import { writeTestResult } from "../common/testUtils.ts";
import { runScrapeTest } from "../common/runScrapeTest.ts";
import { prepare, extract, transform } from "./index.ts";

function calculateCount(): number {
  const startDate = addDays(new Date(), 1);
  const endDate = addMonths(endOfMonth(startDate), 7);
  return differenceInWeeks(endDate, startDate) + 1;
}

const facilityNames = [
  // "男女平等センター", // 改修工事休館中（〜令和8年6月）
  "大原地域活動センター",
  "駒込地域活動センター",
  "不忍通りふれあい館",
  "福祉センター江戸川橋",
  "勤労福祉会館",
  // "シビックホール大ホール", // 有効なデータが取得できないためテストから除外
  "シビックホール小ホール",
  "シビックホールその他施設",
  "アカデミー文京",
  "アカデミー湯島",
  "アカデミー音羽",
  "アカデミー茗台",
  "アカデミー向丘",
];

facilityNames.forEach((name) => {
  test(name, async ({ page }) => {
    await runScrapeTest({
      municipality: "tokyo-bunkyo",
      facility: name,
      context: {},
      sourceRef: "tokyo-bunkyo/index.ts",
      page,
      prepare: () => prepare(page, name),
      extract: (sp) => extract(sp, format(new Date(), "yyyy-MM-dd"), calculateCount()),
      transform: (eo) => transform(eo),
      persist: (to) => writeTestResult("tokyo-bunkyo", name, name, to),
    });
  });
});
