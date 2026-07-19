// spot check の段 2。実サイトを観測して observed/*.json を書く。
// 使い方（packages/scraper で実行）: node tools/spotcheck/observe.ts [--id <plan の id>]
//
// スクレイパーから借りるのは prepare フック（サイトへの到達経路）だけである。
// extract / transform / STATUS_MAP は借りない。借りると観測が scraper の解釈を
// なぞることになり、同じ誤りを再現して MATCH を出すためである。
import { chromium, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import type { ObservedSample, PlanSample } from "./judgeReport.ts";
import { cellToSymbol, findRoomRow, selectTarget, type RawTable } from "./observeCore.ts";
import { applyDivisionFilter, collectTables, strategyFor } from "./observeStrategy.ts";

const OUT_DIR = path.join("test-results", "_spotcheck");

const idFilter = process.argv.includes("--id")
  ? process.argv[process.argv.indexOf("--id") + 1]
  : undefined;

const plan = JSON.parse(await fs.readFile(path.join(OUT_DIR, "plan.json"), "utf8")) as {
  samples: PlanSample[];
};
const samples = idFilter ? plan.samples.filter((s) => s.id === idFilter) : plan.samples;
if (samples.length === 0) {
  console.error("ERROR: 対象サンプルがありません（plan.ts を先に実行してください）");
  process.exit(2);
}

await fs.mkdir(path.join(OUT_DIR, "raw"), { recursive: true });
await fs.mkdir(path.join(OUT_DIR, "observed"), { recursive: true });
await fs.mkdir(path.join(OUT_DIR, "screenshots"), { recursive: true });

const browser = await chromium.launch({ headless: true });
let reachedCount = 0;

interface ScraperTarget {
  [key: string]: unknown;
}

interface ScraperModule {
  scraper: {
    targets: readonly ScraperTarget[];
    facility: (t: ScraperTarget) => string;
    prepare: (p: Page, t: ScraperTarget) => Promise<Page>;
  };
}

for (const [index, sample] of samples.entries()) {
  const seq = String(index + 1);
  const context = await browser.newContext({ locale: "ja-JP" });
  const page = await context.newPage();
  const observed: ObservedSample = {
    id: sample.id,
    reached: false,
    dateDisplayed: false,
    outOfWindow: false,
    cells: [],
    legend: null,
    url: "",
    screenshotPath: `screenshots/${seq}.png`,
    note: "",
  };
  const rawTablesByDivision: Record<string, RawTable[]> = {};
  let bodyText = "";

  try {
    const mod = (await import(`../../${sample.target}/index.ts`)) as ScraperModule;
    const { scraper } = mod;
    const target = selectTarget(
      scraper.targets,
      scraper.facility,
      sample.buildingSystemName,
      sample.institutionSystemName
    );
    if (target === undefined) {
      const available = [...new Set(scraper.targets.map((t) => scraper.facility(t)))];
      observed.note = `target が見つかりません: ${sample.buildingSystemName}。候補: ${available.join(", ")}`;
      throw new Error("no target");
    }

    const active = await scraper.prepare(page, target);
    observed.url = active.url();

    if (strategyFor(sample.target) === "divisionFilter") {
      const failed: string[] = [];
      for (const label of sample.divisionLabels) {
        if (!(await applyDivisionFilter(active, label))) {
          failed.push(label);
          continue;
        }
        rawTablesByDivision[label] = await collectTables(active);
      }
      if (failed.length > 0) {
        observed.note = `区分フィルタを操作できませんでした: ${failed.join(", ")}`;
      }
    } else {
      rawTablesByDivision[""] = await collectTables(active);
    }

    bodyText = (await active.evaluate(() => document.body.innerText))
      .replace(/\n{2,}/g, "\n")
      .slice(0, 6000);

    // 区分ごとに読んだ場合はラベルと値が 1 対 1 に決まる。
    // 一括で読んだ場合はヘッダの区分ラベルと室の行を突き合わせる。
    for (const [label, tables] of Object.entries(rawTablesByDivision)) {
      const found = findRoomRow(tables, sample.institutionSystemName);
      if (!found) continue;
      observed.reached = true;
      observed.dateDisplayed = true;
      if (label) {
        const value = found.cells.slice(1).find((c) => c !== "");
        if (value !== undefined) observed.cells.push({ divisionLabel: label, symbol: value });
      } else {
        for (const [i, symbol] of found.cells.slice(1).entries()) {
          const divisionLabel = found.header[i + 1] ?? "";
          if (divisionLabel) observed.cells.push({ divisionLabel, symbol });
        }
      }
    }

    if (!observed.reached) {
      const rows = Object.values(rawTablesByDivision)
        .flat()
        .flatMap((t) =>
          t.rows.map((r) => cellToSymbol(r[0] ?? { text: "", imgAlt: "", imgSrc: "" }))
        )
        .filter(Boolean);
      observed.note =
        `室「${sample.institutionSystemName}」の行が見つかりません。読めた行: ` +
        [...new Set(rows)].slice(0, 40).join(" / ");
    }

    await active.screenshot({
      path: path.join(OUT_DIR, "screenshots", `${seq}.png`),
      fullPage: true,
    });
  } catch (e) {
    if (!observed.note) observed.note = String((e as Error).message).slice(0, 500);
  } finally {
    await context.close();
  }

  await fs.writeFile(
    path.join(OUT_DIR, "raw", `${seq}.json`),
    JSON.stringify({ id: sample.id, rawTablesByDivision, bodyText }, null, 2)
  );
  await fs.writeFile(
    path.join(OUT_DIR, "observed", `${seq}.json`),
    JSON.stringify(observed, null, 2)
  );
  if (observed.reached) reachedCount++;
  console.log(
    `${observed.reached ? "OK  " : "FAIL"} ${seq} ${sample.id} cells=${observed.cells.length} ${observed.note}`
  );
}

await browser.close();
console.log(
  `SPOTCHECK_OBSERVE ${JSON.stringify({ samples: samples.length, reached: reachedCount })}`
);
