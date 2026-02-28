import { addMonths, differenceInDays, endOfMonth } from "date-fns";
import { createScraperTests } from "../common/testFactory.ts";
import * as scraper from "./index.ts";

function calculateCount(): number {
  const startData = new Date();
  const endDate = addMonths(endOfMonth(startData), 13);
  return differenceInDays(endDate, startData) + 1;
}

createScraperTests({
  outputDir: "tokyo-arakawa",
  facilityNames: [
    "三河島ひろば館",
    // "熊野前ひろば館",
    // "宮地ひろば館",
    "石浜ふれあい館",
    "南千住ふれあい館",
    // "南千住駅前ふれあい館",
    "汐入ふれあい館",
    "峡田ふれあい館",
    "荒川山吹ふれあい館",
    "町屋ふれあい館",
    "荒木田ふれあい館",
    "尾久ふれあい館",
    "西尾久ふれあい館",
    "東日暮里ふれあい館",
    "夕やけこやけふれあい館",
    "西日暮里ふれあい館",
    "東尾久本町通りふれあい館",
    "ひぐらしふれあい館",
    "アクト２１",
    "生涯学習センター",
    "町屋文化センター",
    "アクロスあらかわ",
    "ムーブ町屋",
    "日暮里サニーホール",
    "サンパール荒川",
  ],
  scraper,
  calculateCount,
});
