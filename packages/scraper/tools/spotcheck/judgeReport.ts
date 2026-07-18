// spot check の判定半分。AI を含まない純関数（parityReport.ts と同じ役割分担）。
// 観測側（記号 + 凡例）と期待側（D1 enum + registry ラベル）を独立にカテゴリ化して比べる。
// scraper の STATUS_MAP は import しない（同じ誤りを再現して MATCH を出さないため）。
import { getMunicipalityBySlug } from "@shisetsu-viewer/shared";
import { categorizeSymbol } from "./symbolMap.ts";

export interface PlanSample {
  id: string;
  target: string;
  institutionId: string;
  date: string;
  buildingSystemName: string;
  institutionSystemName: string;
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
    Object.entries(municipality.reservationDivision).map(([division, label]) => [label, division])
  );

  const mismatches: string[] = [];
  for (const cell of observed.cells) {
    const division = labelToDivision.get(cell.divisionLabel);
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
