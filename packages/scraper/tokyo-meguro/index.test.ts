import { test } from "@playwright/test";
import { addDays, addMonths, differenceInWeeks, endOfMonth, format } from "date-fns";
import { writeTestResult } from "../common/testUtils.ts";
import { runScrapeTest } from "../common/runScrapeTest.ts";
import { prepare, extract, transform } from "./index.ts";

function calculateCount(): number {
  const startDate = addDays(new Date(), 1);
  const endDate = addMonths(endOfMonth(startDate), 7);
  return Math.ceil(differenceInWeeks(endDate, startDate) / 2) + 1;
}

const facilityNames = [
  // 中小企業センター
  "中小企業センター",
  // 勤労福祉会館
  "勤労福祉会館",
  // 住区センター
  "田道住区センター三田分室",
  "上目黒住区センター",
  "菅刈住区センター",
  "東山住区センター",
  "中目黒住区センター",
  "田道住区センター",
  "下目黒住区センター",
  "不動住区センター",
  "油面住区センター",
  "五本木住区センター",
  "鷹番住区センター",
  "月光原住区センター",
  "向原住区センター",
  "碑住区センター",
  "原町住区センター",
  "大岡山東住区センター",
  "大岡山西住区センター",
  "中根住区センター",
  "八雲住区センター",
  "東根住区センター",
  // 文化ホール
  "めぐろパーシモンホール",
  "中目黒ＧＴプラザホール",
  // 社会教育・文化会館
  "東山社会教育館",
  "中央町社会教育館",
  "目黒本町社会教育館",
  "緑が丘文化会館",
  "区民センター社会教育館",
  // いこいの家
  "菅刈住区いこいの家",
  "東山住区いこいの家",
  "烏森住区いこいの家",
  "月光原住区いこいの家",
  "向原住区いこいの家",
  "碑住区いこいの家",
  "大岡山東住区いこいの家",
];

facilityNames.forEach((name) => {
  test(name, async ({ page }) => {
    await runScrapeTest({
      municipality: "tokyo-meguro",
      facility: name,
      context: {},
      sourceRef: "tokyo-meguro/index.ts",
      page,
      prepare: () => prepare(page, name),
      extract: (sp) => extract(sp, format(new Date(), "yyyy/M/d"), calculateCount()),
      transform: (eo) => transform(eo),
      persist: (to) => writeTestResult("tokyo-meguro", name, name, to),
    });
  });
});
