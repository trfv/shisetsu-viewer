// spot check の段 1。サンプル選定と D1 期待値取得。AI を含まない決定論スクリプト。
// 使い方（packages/scraper で実行）:
//   node tools/spotcheck/plan.ts [--municipality tokyo-koutou] [--key <institution_id>:<date>]... [--samples 8]
// 前提: gh 認証済み + wrangler login 済み（D1 読取に使う）。
// 出力: test-results/_spotcheck/plan.json（エージェント用・期待値なし）/ expected.json（judge 用）。
// エージェントに期待値を見せない盲検構成のため、D1 読取は必ずこのスクリプトの中で行う。
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import {
  MUNICIPALITIES,
  getMunicipalityBySlug,
  type MunicipalityConfig,
} from "@shisetsu-viewer/shared";

import type { ExpectedSample, PlanSample } from "./judgeReport.ts";
import { SAMPLE_CAP, selectSamples, type SampleKey } from "./sampling.ts";

const OUT_DIR = path.join("test-results", "_spotcheck");
const WRANGLER_CONFIG = path.join("..", "api", "wrangler.jsonc");

const { values } = parseArgs({
  options: {
    municipality: { type: "string" },
    key: { type: "string", multiple: true },
    samples: { type: "string" },
  },
});

function fail(message: string): never {
  console.error(`ERROR: ${message}`);
  process.exit(2);
}

function d1Query<T>(sql: string): T[] {
  let out = "";
  try {
    out = execFileSync(
      "npx",
      [
        "wrangler",
        "d1",
        "execute",
        "shisetsu-db",
        "--remote",
        "--json",
        "--config",
        WRANGLER_CONFIG,
        "--command",
        sql,
      ],
      { encoding: "utf8", timeout: 120_000 }
    );
  } catch (e) {
    fail(
      `wrangler d1 execute に失敗しました。未ログインの場合は「! npx wrangler login」を実行してください。\n${String(e)}`
    );
  }
  // wrangler がバナー等を先頭に出す場合に備え、JSON 配列の開始位置から読む。
  const start = out.indexOf("[");
  if (start < 0) fail(`wrangler の出力に JSON がありません:\n${out}`);
  let parsed: { success?: boolean; error?: string; results: T[] }[];
  try {
    parsed = JSON.parse(out.slice(start)) as { success?: boolean; error?: string; results: T[] }[];
  } catch (e) {
    fail(`wrangler の出力の JSON parse に失敗しました:\n${out}\n${String(e)}`);
  }
  if (parsed[0]?.success === false) {
    fail(
      `wrangler d1 execute がエラーを返しました: ${parsed[0].error ?? JSON.stringify(parsed[0])}`
    );
  }
  return parsed[0]?.results ?? [];
}

function quote(value: string): string {
  // SampleKey は正規表現で [0-9a-fA-F-] / 日付形式に検証済みだが、防御として引用符を重ねる。
  return `'${value.replaceAll("'", "''")}'`;
}

function parseExplicitKeys(raw: string[], municipality: string | undefined): SampleKey[] {
  return raw.map((entry) => {
    const [institutionId, date] = entry.split(":");
    if (
      !institutionId ||
      !date ||
      !/^[0-9a-fA-F-]+$/.test(institutionId) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      fail(`--key の形式が不正です（<institution_id>:<YYYY-MM-DD>）: ${entry}`);
    }
    if (!municipality) {
      fail("--key を使うときは --municipality も指定してください（施設名解決に使います）");
    }
    return { target: municipality, institutionId, date };
  });
}

/** target（tokyo-koutou）→ D1 の municipality 値（MUNICIPALITY_KOUTOU）。 */
function municipalityValue(target: string): string {
  const slug = target.split("-")[1];
  if (!slug) fail(`不正な自治体指定: ${target}`);
  return `MUNICIPALITY_${slug.toUpperCase()}`;
}

/**
 * target（tokyo-koutou）の reservationDivision 表示ラベル一覧。
 * エージェントが観測区分をこの一覧に正規化して書けるよう plan.json に載せる（期待値ではない）。
 */
function divisionLabelsForTarget(target: string): string[] {
  const slug = target.split("-")[1];
  const municipality = slug !== undefined ? getMunicipalityBySlug(slug) : undefined;
  return municipality ? Object.values(municipality.reservationDivision) : [];
}

interface InstitutionRow {
  id: string;
  municipality: string;
  building_system_name: string;
  institution_system_name: string;
}
interface ReservationRow {
  institution_id: string;
  date: string;
  reservation: string;
}
interface FallbackRow extends ReservationRow {
  building_system_name: string;
  institution_system_name: string;
}

const explicitKeys = parseExplicitKeys(values.key ?? [], values.municipality);
const cap = values.samples !== undefined ? Number(values.samples) : undefined;
if (cap !== undefined && (!Number.isInteger(cap) || cap < 1))
  fail("--samples は正の整数で指定してください");
// SAMPLE_CAP はコスト規律のハードキャップ。ここで一度だけクランプし、selectSamples への
// 引き渡しと乱択フォールバックのループ条件の両方で同じ値を使う（クランプの迂回を防ぐ）。
const clampedCap = Math.min(cap ?? 8, SAMPLE_CAP);

// --key 明示指定時は明示キーのみを対象にする。--key 未指定なら空で始まり、
// 下の乱択フォールバックが D1 からサンプルを埋める。
const keys = selectSamples({
  explicitKeys,
  municipalityFilter: values.municipality,
  cap: clampedCap,
});

// 乱択フォールバック。--key 指定時は keys が 0 件のときだけ発動する。
// 既定（--key 未指定）は全サンプルがここで埋まる。
// CI 除外自治体（scraperCiExcluded）は外すが、--municipality の明示指定は除外より優先する。
// 各自治体の先頭 1 施設 × 直近日を決定論的に取る。
const fallbackNames = new Map<string, { building: string; institution: string }>();
const shouldFillRandom = explicitKeys.length > 0 ? keys.length === 0 : keys.length < clampedCap;
if (shouldFillRandom) {
  // 明示キーと乱択で二重に同じサンプルを含めないための排他集合。
  const pickedKeySet = new Set(keys.map((k) => `${k.target}:${k.institutionId}:${k.date}`));
  const targets =
    values.municipality !== undefined
      ? [values.municipality]
      : Object.values<MunicipalityConfig>(MUNICIPALITIES)
          .filter((m) => !m.reservationExcluded && !m.scraperCiExcluded)
          .map((m) => `${m.prefecture}-${m.slug}`);
  for (const target of targets) {
    if (keys.length >= clampedCap) break;
    // SQLite の date('now') は UTC 基準。このプロジェクトは JST 運用で、予約サイトも D1 も
    // JST の日付で動くため、JST 早朝（00:00〜08:59）は UTC 日付が 1 日ずれて「JST では
    // 既に過去の日付」を拾ってしまう。予約サイトは過去日を表示しないため観測が
    // dateDisplayed: false になり、judge が SITE_NO_DATA_D1_STALE（要調査）を毎回誤検出する。
    const rows = d1Query<FallbackRow>(
      `SELECT r.institution_id, r.date, r.reservation, i.building_system_name, i.institution_system_name
       FROM reservations r JOIN institutions i ON i.id = r.institution_id
       WHERE i.municipality = ${quote(municipalityValue(target))} AND r.date >= date('now', '+9 hours')
       ORDER BY r.institution_id, r.date LIMIT 1`
    );
    const row = rows[0];
    if (row && !pickedKeySet.has(`${target}:${row.institution_id}:${row.date}`)) {
      keys.push({ target, institutionId: row.institution_id, date: row.date });
      fallbackNames.set(row.institution_id, {
        building: row.building_system_name,
        institution: row.institution_system_name,
      });
    }
  }
}
if (keys.length === 0) fail("サンプルを 1 件も選べませんでした（D1 が空）");

// 施設名の解決と期待値の取得。
const ids = [...new Set(keys.map((k) => k.institutionId))];
const institutions = new Map(
  d1Query<InstitutionRow>(
    `SELECT id, municipality, building_system_name, institution_system_name
     FROM institutions WHERE id IN (${ids.map(quote).join(",")})`
  ).map((row) => [row.id, row])
);
const pairPredicate = keys
  .map((k) => `(institution_id = ${quote(k.institutionId)} AND date = ${quote(k.date)})`)
  .join(" OR ");
const reservations = new Map(
  d1Query<ReservationRow>(
    `SELECT institution_id, date, reservation FROM reservations WHERE ${pairPredicate}`
  ).map((row) => [`${row.institution_id}:${row.date}`, row.reservation])
);

const planSamples: PlanSample[] = [];
const expectedSamples: ExpectedSample[] = [];
for (const key of keys) {
  const inst = institutions.get(key.institutionId);
  const names = fallbackNames.get(key.institutionId);
  if (!inst && !names) {
    console.warn(`WARN: institution が D1 に無いためスキップ: ${key.institutionId}`);
    continue;
  }
  const id = `${key.target}:${key.institutionId}:${key.date}`;
  planSamples.push({
    id,
    target: key.target,
    institutionId: key.institutionId,
    date: key.date,
    buildingSystemName: inst?.building_system_name ?? names?.building ?? "",
    institutionSystemName: inst?.institution_system_name ?? names?.institution ?? "",
    divisionLabels: divisionLabelsForTarget(key.target),
  });
  const raw = reservations.get(`${key.institutionId}:${key.date}`);
  expectedSamples.push({
    id,
    reservation: raw !== undefined ? (JSON.parse(raw) as Record<string, string>) : null,
  });
}

await fs.rm(OUT_DIR, { recursive: true, force: true });
await fs.mkdir(path.join(OUT_DIR, "observed"), { recursive: true });
await fs.mkdir(path.join(OUT_DIR, "screenshots"), { recursive: true });
const planPath = path.join(OUT_DIR, "plan.json");
await fs.writeFile(planPath, JSON.stringify({ samples: planSamples }, null, 2));
await fs.writeFile(
  path.join(OUT_DIR, "expected.json"),
  JSON.stringify({ samples: expectedSamples }, null, 2)
);
console.log(`SPOTCHECK_PLAN ${JSON.stringify({ samples: planSamples.length, planPath })}`);
