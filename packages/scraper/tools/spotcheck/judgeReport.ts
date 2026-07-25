// spot check の判定半分。AI を含まない純関数（parityReport.ts と同じ役割分担）。
// 観測側（記号 + 凡例）と期待側（D1 enum + registry ラベル）を独立にカテゴリ化して比べる。
// scraper の STATUS_MAP は import しない（同じ誤りを再現して MATCH を出さないため）。
import { getMunicipalityBySlug } from "@shisetsu-viewer/shared";

import { bandFromDivisionEnum, bandFromHour, parseStartHour, type Band } from "./divisionBand.ts";
import { categorizeSymbol, type SlotCategory } from "./symbolMap.ts";

export interface PlanSample {
  id: string;
  target: string;
  institutionId: string;
  date: string;
  buildingSystemName: string;
  institutionSystemName: string;
  /** その自治体の reservationDivision の表示ラベル一覧。エージェントが観測区分を正規化する手掛かり（期待値ではない）。 */
  divisionLabels: string[];
}

export interface ExpectedSample {
  id: string;
  reservation: Record<string, string> | null;
}

export interface ObservedSample {
  id: string;
  reached: boolean;
  dateDisplayed: boolean;
  outOfWindow: boolean;
  cells: { divisionLabel: string; symbol: string }[];
  legend: Record<string, string> | null;
  url: string;
  screenshotPath: string;
  note: string;
}

export type Verdict =
  | "MATCH"
  | "MISMATCH"
  | "SITE_HAS_DATA_D1_MISSING"
  | "SITE_NO_DATA"
  | "SITE_NO_DATA_D1_STALE"
  | "OUT_OF_WINDOW"
  | "UNREACHABLE"
  | "UNMAPPED";

export interface SampleJudgement {
  id: string;
  verdict: Verdict;
  detail: string;
}

/** exit code と報告の強調に使う。「人間の調査が要る判定」だけ true。 */
export function needsInvestigation(verdict: Verdict): boolean {
  return verdict !== "MATCH" && verdict !== "SITE_NO_DATA" && verdict !== "OUT_OF_WINDOW";
}

/**
 * 区分ラベル突合の表記ゆれを吸収する（全角数字→半角、範囲記号の統一、空白の除去）。
 * registry 側のラベルと観測側のラベルの両方に同じ関数を適用する。
 * 内部空白も落とすのは observeCore.ts の normalizeLabel と揃えるため
 * （「09:00 - 12:00」と「09:00-12:00」を同一視する）。
 */
function normalizeDivisionLabel(label: string): string {
  const halfWidthDigits = label.replace(/[０-９]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 0xfee0)
  );
  return halfWidthDigits.replace(/[～〜\-−ー]/g, "-").replace(/\s+/g, "");
}

function pushCategory(bands: Map<Band, SlotCategory[]>, band: Band, category: SlotCategory): void {
  const list = bands.get(band);
  if (list) list.push(category);
  else bands.set(band, [category]);
}

/**
 * band モードの突合。サイトの区分と D1 の区分をそれぞれ時間帯バンドに畳み、
 * バンドごとのカテゴリのマルチセット（ソート済み配列）を比べる。
 *
 * 畳む根拠は「サイトが表示する開始時刻」と「registry 由来の enum 識別子」だけで、
 * scraper の DIVISION_MAP は見ない。見ると変換テーブルの誤りを判定器が再現し、
 * silent failure 検出器としての独立性が失われるため。
 *
 * 午後1 と午後2 のような同一バンド内の細分は集約されるため、バンド内のスワップは
 * 検出できない（承認済みの割り切り）。バンドを跨ぐ取り違えと欠落は検出できる。
 *
 * 想定外（バンドに畳めない・カテゴリ化できない）は握り潰さず `unmapped` として返し、
 * 呼び出し側で UNMAPPED にする。`mismatches` が空配列なら全バンド一致。
 */
function compareByBand(
  cells: readonly { divisionLabel: string; symbol: string }[],
  legend: Readonly<Record<string, string>> | undefined,
  reservation: Readonly<Record<string, string>>,
  statusLabels: Readonly<Record<string, string>>
): { unmapped: string } | { mismatches: string[] } {
  const observedBands = new Map<Band, SlotCategory[]>();
  for (const cell of cells) {
    const hour = parseStartHour(cell.divisionLabel);
    if (hour === null) return { unmapped: `区分ラベルを時刻として読めない: ${cell.divisionLabel}` };
    const category = categorizeSymbol(cell.symbol, legend);
    if (category === "UNKNOWN") return { unmapped: `記号不明: ${cell.symbol}（凡例にも無い）` };
    pushCategory(observedBands, bandFromHour(hour), category);
  }

  const expectedBands = new Map<Band, SlotCategory[]>();
  for (const [division, enumValue] of Object.entries(reservation)) {
    const band = bandFromDivisionEnum(division);
    if (band === null) return { unmapped: `区分 enum を時間帯に畳めない: ${division}` };
    // 期待側も categorizeSymbol を使う（凡例は渡さない。凡例はサイト側の情報であって
    // registry のラベル解釈に使うものではない）。
    const category = categorizeSymbol(statusLabels[enumValue] ?? "");
    if (category === "UNKNOWN") {
      return { unmapped: `enum の表示ラベルをカテゴリ化できない: ${enumValue}` };
    }
    pushCategory(expectedBands, band, category);
  }

  const mismatches: string[] = [];
  for (const band of ["morning", "afternoon", "evening"] as const) {
    const site = [...(observedBands.get(band) ?? [])].sort();
    const d1 = [...(expectedBands.get(band) ?? [])].sort();
    if (site.join(",") !== d1.join(",")) {
      mismatches.push(
        `${band}: サイト [${site.join(",") || "なし"}] vs D1 [${d1.join(",") || "なし"}]`
      );
    }
  }
  return { mismatches };
}

export function judgeSample(
  plan: PlanSample,
  expected: ExpectedSample | undefined,
  observed: ObservedSample | undefined
): SampleJudgement {
  const judgement = (verdict: Verdict, detail: string): SampleJudgement => ({
    id: plan.id,
    verdict,
    detail,
  });

  if (!observed || !observed.reached) {
    return judgement("UNREACHABLE", observed?.note || "観測記録なし");
  }
  const reservation = expected?.reservation ?? null;
  if (!observed.dateDisplayed) {
    if (observed.outOfWindow) {
      return judgement("OUT_OF_WINDOW", `サイトの受付期間外: ${plan.date}`);
    }
    return reservation === null
      ? judgement("SITE_NO_DATA", `サイトにも D1 にも ${plan.date} の表示がない`)
      : judgement("SITE_NO_DATA_D1_STALE", `サイトに ${plan.date} の表示が無いが D1 に行がある`);
  }
  if (reservation === null) {
    return judgement(
      "SITE_HAS_DATA_D1_MISSING",
      `サイトは ${plan.date} を表示しているが D1 に行がない（${observed.cells.length} 区分観測）`
    );
  }

  const slug = plan.target.split("-")[1];
  const municipality = slug !== undefined ? getMunicipalityBySlug(slug) : undefined;
  if (!municipality) {
    return judgement("UNMAPPED", `未知の自治体: ${plan.target}`);
  }
  const labelToDivision = new Map(
    Object.entries(municipality.reservationDivision).map(([division, label]) => [
      normalizeDivisionLabel(label),
      division,
    ])
  );

  // モード判別: observed の全セルが registry ラベルに一致すれば従来の 1:1 照合（exact）。
  // 一致しないが全セルが時刻レンジとして読めるなら band 照合。どちらでもなければ
  // exact 経路に流して UNMAPPED を出させる（真に未知のラベル＝実際の異常）。
  //
  // exact を先に見るのは、北区のように registry ラベル自体が時刻レンジの自治体を
  // band に落として区分粒度を失わないため。
  const isExact = observed.cells.every((cell) =>
    labelToDivision.has(normalizeDivisionLabel(cell.divisionLabel))
  );
  if (!isExact && observed.cells.every((cell) => parseStartHour(cell.divisionLabel) !== null)) {
    const result = compareByBand(
      observed.cells,
      observed.legend ?? undefined,
      reservation,
      municipality.reservationStatus
    );
    if ("unmapped" in result) return judgement("UNMAPPED", result.unmapped);
    return result.mismatches.length === 0
      ? judgement("MATCH", `${observed.cells.length} 区分を時間帯バンドで一致`)
      : judgement("MISMATCH", result.mismatches.join(" / "));
  }

  const mismatches: string[] = [];
  for (const cell of observed.cells) {
    const division = labelToDivision.get(normalizeDivisionLabel(cell.divisionLabel));
    if (division === undefined) {
      return judgement("UNMAPPED", `区分ラベル不明: ${cell.divisionLabel}`);
    }
    const enumValue = reservation[division];
    if (enumValue === undefined) {
      mismatches.push(`${cell.divisionLabel}: D1 に区分なし`);
      continue;
    }
    const observedCategory = categorizeSymbol(cell.symbol, observed.legend ?? undefined);
    if (observedCategory === "UNKNOWN") {
      return judgement("UNMAPPED", `記号不明: ${cell.symbol}（凡例にも無い）`);
    }
    // 期待側も categorizeSymbol を使う（凡例は渡さない。凡例はサイト側の情報であって
    // registry のラベル解釈に使うものではない）。registry の一部自治体は表示ラベルに
    // 記号そのものを格納しているため、記号表→ラベル正規表現の順で解釈する。
    const expectedCategory = categorizeSymbol(municipality.reservationStatus[enumValue] ?? "");
    if (expectedCategory === "UNKNOWN") {
      return judgement("UNMAPPED", `enum の表示ラベルをカテゴリ化できない: ${enumValue}`);
    }
    if (observedCategory !== expectedCategory) {
      mismatches.push(
        `${cell.divisionLabel}: サイト ${cell.symbol}(${observedCategory}) vs D1 ${enumValue}(${expectedCategory})`
      );
    }
  }
  return mismatches.length === 0
    ? judgement("MATCH", `${observed.cells.length} 区分一致`)
    : judgement("MISMATCH", mismatches.join(" / "));
}
