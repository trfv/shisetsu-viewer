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
import { cellToSymbol, extractCells, selectTarget, type RawTable } from "./observeCore.ts";
import { applyDivisionFilter, collectTables, strategyFor } from "./observeStrategy.ts";

/** 既存の note を保ちつつ追記する（修正6: 無条件上書きで既存 note が消える問題の修正） */
function appendNote(note: string, addition: string): string {
  return note ? `${note} / ${addition}` : addition;
}

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
    // prepare は空き状況が描画される前に戻ることがある。検索実行直後に return する
    // 実装（江東区）や、SPA のポストバック遷移が未完了なのに旧ページの table で
    // waitFor が満たされて返る実装（豊島区）、body 自体がまだ空の実装（荒川区）が
    // ある。本番の extract は直後に要素へアクセスして auto-wait で吸収するが、
    // observe は即読みするため、ここでネットワークが静まるのを待って描画を待つ。
    await active.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
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
        observed.note = appendNote(
          observed.note,
          `区分フィルタを操作できませんでした: ${failed.join(", ")}`
        );
      }
    } else {
      rawTablesByDivision[""] = await collectTables(active);
    }

    bodyText = (await active.evaluate(() => document.body?.innerText ?? ""))
      .replace(/\n{2,}/g, "\n")
      .slice(0, 6000);

    // 表の類型（4 種）は区分ラベルとの照合を軸に自動判別する（observeCore.extractCells）。
    // divisionFilter 戦略のときは区分ごとに絞った表を読んだので、必ず類型D（dateColumn）
    // として抽出する。direct 戦略のときは一括で読んだ表から類型を自動判別する。
    const isDivisionFilter = strategyFor(sample.target) === "divisionFilter";
    const layouts = new Set<string>();
    for (const [label, tables] of Object.entries(rawTablesByDivision)) {
      const extracted = isDivisionFilter
        ? extractCells(
            tables,
            sample.divisionLabels,
            sample.institutionSystemName,
            sample.date,
            label
          )
        : extractCells(tables, sample.divisionLabels, sample.institutionSystemName, sample.date);
      layouts.add(extracted.layout);
      if (extracted.cells.length === 0) continue;
      observed.reached = true;
      observed.dateDisplayed = true;
      observed.cells.push(...extracted.cells);
    }
    if (layouts.size > 0) {
      observed.note = appendNote(observed.note, `layout=${[...layouts].join(",")}`);
    }

    if (!observed.reached) {
      const rows = Object.values(rawTablesByDivision)
        .flat()
        .flatMap((t) =>
          t.rows.map((r) => cellToSymbol(r[0] ?? { text: "", imgAlt: "", imgSrc: "" }))
        )
        .filter(Boolean);
      observed.note = appendNote(
        observed.note,
        `室「${sample.institutionSystemName}」の行が見つかりません。読めた行: ` +
          [...new Set(rows)].slice(0, 40).join(" / ")
      );
    }

    await active.screenshot({
      path: path.join(OUT_DIR, "screenshots", `${seq}.png`),
      fullPage: true,
    });
  } catch (e) {
    if (!observed.note) observed.note = String((e as Error).message).slice(0, 500);
  } finally {
    // context.close() が例外を投げても残りのサンプルの処理と browser.close() を続ける（修正7）。
    await context.close().catch(() => {});
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
