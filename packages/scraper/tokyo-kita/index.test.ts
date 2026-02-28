import { addMonths, differenceInDays, endOfMonth } from "date-fns";
import { createScraperTests } from "../common/testFactory.ts";
import * as scraper from "./index.ts";

function calculateCount(): number {
  const startData = new Date();
  const endDate = addMonths(endOfMonth(startData), 14);
  return differenceInDays(endDate, startData) + 1;
}

createScraperTests({
  outputDir: "tokyo-kita",
  facilityNames: ["北とぴあ", "滝野川会館", "赤羽会館"],
  scraper,
  calculateCount,
});
