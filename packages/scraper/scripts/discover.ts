// 対象一覧の自動列挙 CLI。サイトの施設階層をクロールして targets 候補を
// data/targets/<name>.candidates.json に書き出す。
//
// 使い方:
//   npm run discover -w @shisetsu-viewer/scraper -- <municipality>
//     既存スクレイパーの discover フックを実行し、現行 targets との差分も表示する。
//     例: npm run discover -w @shisetsu-viewer/scraper -- tokyo-kita
//
//   npm run discover -w @shisetsu-viewer/scraper -- --engine <openreaf|webrGrand> --url <baseUrl> [--name <出力名>]
//     スクレイパー未作成の新地区でも、既知エンジンの製品なら列挙できる。
//     例: npm run discover -w @shisetsu-viewer/scraper -- --engine openreaf --url https://example.openreaf02.jp/ --name tokyo-example
import fs from "node:fs/promises";
import path from "node:path";

import { chromium, type Page } from "@playwright/test";

import type { ScraperDefinition } from "../common/defineScraper.ts";
import {
  type DiscoveredTarget,
  formatDiscoveryReport,
  type TargetKey,
} from "../common/discover.ts";
import { discoverOpenreafTargets } from "../engines/openreaf.ts";
import { discoverWebrGrandTargets } from "../engines/webrGrand.ts";

const ENGINE_DISCOVERERS: Record<
  string,
  (page: Page, opts: { baseUrl: string }) => Promise<DiscoveredTarget[]>
> = {
  openreaf: discoverOpenreafTargets,
  webrGrand: discoverWebrGrandTargets,
};

function parseArgs(argv: string[]): {
  municipality?: string;
  engine?: string;
  url?: string;
  name?: string;
} {
  const result: { municipality?: string; engine?: string; url?: string; name?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = argv[i + 1];
    if (arg === "--engine" && value !== undefined) {
      result.engine = value;
      i++;
    } else if (arg === "--url" && value !== undefined) {
      result.url = value;
      i++;
    } else if (arg === "--name" && value !== undefined) {
      result.name = value;
      i++;
    } else if (arg && !arg.startsWith("--")) {
      result.municipality = arg;
    }
  }
  return result;
}

function usage(): never {
  console.error(
    [
      "Usage:",
      "  node scripts/discover.ts <municipality>",
      "  node scripts/discover.ts --engine <openreaf|webrGrand> --url <baseUrl> [--name <出力名>]",
    ].join("\n")
  );
  process.exit(2);
}

const args = parseArgs(process.argv.slice(2));

let existingKeys: TargetKey[] | undefined;
let outputName: string;
let discover: (page: Page) => Promise<DiscoveredTarget[]>;

if (args.municipality) {
  outputName = args.municipality;
  const mod = (await import(`../${args.municipality}/index.ts`)) as {
    scraper: ScraperDefinition<unknown, { length: number }>;
  };
  const scraper = mod.scraper;
  if (!scraper.discover) {
    console.error(
      `${args.municipality} のスクレイパーに discover フックがありません。` +
        `engines/ の hooks を使うか、defineScraper に discover を実装してください。`
    );
    process.exit(1);
  }
  discover = scraper.discover;
  existingKeys = scraper.targets.map((t) => {
    const context = scraper.context?.(t) ?? {};
    const roomName = typeof context["roomName"] === "string" ? context["roomName"] : undefined;
    return { facilityName: scraper.facility(t), roomName };
  });
} else if (args.engine && args.url) {
  const engineDiscover = ENGINE_DISCOVERERS[args.engine];
  if (!engineDiscover) {
    console.error(
      `Unknown engine: ${args.engine} (available: ${Object.keys(ENGINE_DISCOVERERS).join(", ")})`
    );
    process.exit(1);
  }
  const baseUrl = args.url;
  outputName = args.name ?? new URL(baseUrl).hostname;
  discover = (page) => engineDiscover(page, { baseUrl });
} else {
  usage();
}

const browser = await chromium.launch({
  args: ["--disable-gpu", "--disable-extensions", "--disable-images"],
});

let discovered: DiscoveredTarget[];
try {
  const page = await browser.newPage();
  discovered = await discover(page);
} finally {
  await browser.close();
}

const outDir = path.join("data", "targets");
const outPath = path.join(outDir, `${outputName}.candidates.json`);
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(outPath, JSON.stringify(discovered, null, 2) + "\n");

console.log(formatDiscoveryReport(discovered, existingKeys));
console.log(`\n候補一覧を書き出しました: ${outPath}`);
console.log(
  "musicLikely と category を目印にキュレーションし、target フィールドを index.ts の targets に貼り付けてください。"
);
