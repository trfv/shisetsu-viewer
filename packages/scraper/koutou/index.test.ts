import fs from "fs/promises";
import { test, expect } from "@playwright/test";
import { prepare, extract, transform } from "./index";

[
  "江東区文化センター",
  "東大島文化センター",
  "豊洲文化センター",
  "砂町文化センター",
  "森下文化センター",
  "古石場文化センター",
  "亀戸文化センター",
  "総合区民センター",
  "江東公会堂（ティアラこうとう）",
  "深川江戸資料館",
  "芭蕉記念館",
  "中川船番所資料館",
  "商工情報センター",
].forEach((name) => {
  test(name, async ({ page }) => {
    console.log(`start scraping for ${name}`);

    const searchPage = await prepare(page, name);
    expect(page.title()).not.toBeNull();
    const extractOutput = await extract(searchPage);
    expect(extractOutput.length).toBeGreaterThan(1);
    const transformOutput = await transform(extractOutput);
    expect(transformOutput.length).toBeGreaterThan(1);

    console.log(`finish scraping for ${name}`);

    await fs.mkdir("test_results/koutou", { recursive: true });
    await fs.writeFile(`test_results/koutou/${name}.json`, JSON.stringify(transformOutput));
  });
});
