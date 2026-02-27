import fs from "fs/promises";
import { test, expect } from "@playwright/test";
import { addDays, addMonths, differenceInDays, endOfMonth } from "date-fns";
import { validateTransformOutput } from "../common/validation";
import { prepare, extract, transform } from "./index";

function calculateCount(): number {
  const startData = addDays(new Date(), 1);
  const endDate = addMonths(endOfMonth(startData), 5);
  return differenceInDays(endDate, startData) + 1;
}

const scrapeTargets = [
  {
    facilityName: "築地社会教育会館",
    roomName: "音楽室",
    links: ["社会教育会館", "築地社会教育会館", "次の一覧", "音楽室"],
  },
  {
    facilityName: "日本橋社会教育会館",
    roomName: "音楽室",
    links: ["社会教育会館", "日本橋社会教育会館", "音楽室"],
  },
  {
    facilityName: "日本橋社会教育会館",
    roomName: "ホール全体（舞台・客席付）",
    links: ["社会教育会館", "日本橋社会教育会館（ホール）", "ホール 全体（舞台・客席付）"],
  },
  {
    facilityName: "日本橋社会教育会館",
    roomName: "ホールフロア（床のみ）",
    links: ["社会教育会館", "日本橋社会教育会館（ホール）", "ホール フロア（床のみ）"],
  },
  {
    facilityName: "月島社会教育会館",
    roomName: "ホール全体（舞台・客席付）",
    links: ["社会教育会館", "月島社会教育会館（ホール）", "ホール 全体（舞台・客席付）"],
  },
  {
    facilityName: "月島社会教育会館",
    roomName: "ホールフロア（床のみ）",
    links: ["社会教育会館", "月島社会教育会館（ホール）", "ホール フロア（床のみ）"],
  },
  {
    facilityName: "アートはるみ",
    roomName: "音楽室",
    links: ["社会教育会館", "月島社会教育会館分館アートはるみ", "音楽室"],
  },
  // {
  //   facilityName: "晴海地域交流センター",
  //   roomName: "音楽スタジオ (第１音楽スタジオ)",
  //   links: ["晴海地域交流センター", "次の一覧", "音楽スタジオ (第１音楽スタジオ)"],
  // },
  // {
  //   facilityName: "晴海地域交流センター",
  //   roomName: "音楽スタジオ (第２音楽スタジオ)",
  //   links: ["晴海地域交流センター", "次の一覧", "音楽スタジオ (第２音楽スタジオ)"],
  // },
  // {
  //   facilityName: "晴海地域交流センター",
  //   roomName: "音楽スタジオ (第３音楽スタジオ)",
  //   links: ["晴海地域交流センター", "次の一覧", "音楽スタジオ (第３音楽スタジオ)"],
  // },
  // {
  //   facilityName: "晴海地域交流センター",
  //   roomName: "音楽スタジオ (第４音楽スタジオ)",
  //   links: ["晴海地域交流センター", "次の一覧", "音楽スタジオ (第４音楽スタジオ)"],
  // },
];

scrapeTargets.forEach((target) => {
  const { facilityName, roomName, links } = target;
  const title = `${facilityName} ${roomName}`;
  test(title, async ({ page }) => {
    console.time(title);

    let searchPage;
    try {
      searchPage = await prepare(page, links);
    } catch (e) {
      console.error(`Failed to prepare page for ${title}, and skip to next.`);
      throw e;
    }
    const extractOutput = await extract(searchPage, calculateCount());
    expect(extractOutput.length).toBeGreaterThan(0);
    const transformOutput = await transform(roomName, extractOutput);
    expect(transformOutput.length).toBeGreaterThan(0);
    expect(validateTransformOutput(transformOutput)).toEqual([]);

    console.timeEnd(title);

    await fs.mkdir("test-results/tokyo-chuo", { recursive: true });
    await fs.writeFile(
      `test-results/tokyo-chuo/${facilityName}-${roomName}.json`,
      JSON.stringify({ facility_name: facilityName, data: transformOutput })
    );

    await searchPage.close();
    await page.close();
  });
});
