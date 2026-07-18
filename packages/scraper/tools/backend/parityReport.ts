/**
 * JSON レポートに載せる乖離サンプルの上限（Issue 本文が肥大しないように絞る）。
 * export しないのは knip が未使用 export として検出するため。
 */
const SAMPLE_LIMIT = 5;

/** 突合窓の上限に足す月数。全自治体の horizon.monthsAhead の最小値。 */
const WINDOW_MONTHS_AHEAD = 5;

/**
 * 突合対象の日付窓 [from, to]（ともに "YYYY-MM-DD"）を返す。
 * from = 今日、to = 今日の月末 + WINDOW_MONTHS_AHEAD ヶ月の月末。
 * 既存 parity.ts が from を toISOString()（UTC）で作っているため、
 * date-fns（ローカル時刻）ではなく UTC 演算で揃える。月境界の TZ ずれを避ける。
 */
export function reservationWindow(now: Date): { from: string; to: string } {
  const from = now.toISOString().slice(0, 10);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  // Date.UTC(y, monthIndex, 0) は「その monthIndex の前月の末日」。
  // m + WINDOW_MONTHS_AHEAD + 1 を渡すと (m + WINDOW_MONTHS_AHEAD) 月の末日になる。
  const to = new Date(Date.UTC(y, m + WINDOW_MONTHS_AHEAD + 1, 0)).toISOString().slice(0, 10);
  return { from, to };
}

export interface MunicipalityReport {
  target: string;
  hasuraRows: number;
  d1Rows: number;
  /** Hasura にあり D1 に無い */
  missing: number;
  /** D1 にあり Hasura に無い */
  extra: number;
  /** 両方にあるが reservation が異なる */
  diff: number;
  samples: string[];
}

/**
 * 1 自治体分の Hasura / D1 を突合する。
 * 引数の Map は「行キー → canonicalize 済み reservation 文字列」。
 * 値は canonicalize 済みである前提なので、比較は素の文字列比較でよい。
 */
export function compareMunicipality(
  target: string,
  hasura: Map<string, string>,
  d1: Map<string, string>
): MunicipalityReport {
  const samples: string[] = [];
  let missing = 0;
  let extra = 0;
  let diff = 0;

  const addSample = (line: string): void => {
    if (samples.length < SAMPLE_LIMIT) samples.push(line);
  };

  for (const [k, hval] of hasura) {
    const dval = d1.get(k);
    if (dval === undefined) {
      missing++;
      addSample(`MISSING in D1: ${k}`);
    } else if (dval !== hval) {
      diff++;
      addSample(`DIFF: ${k}`);
    }
  }
  for (const k of d1.keys()) {
    if (!hasura.has(k)) {
      extra++;
      addSample(`EXTRA in D1: ${k}`);
    }
  }

  return { target, hasuraRows: hasura.size, d1Rows: d1.size, missing, extra, diff, samples };
}

export function totalMismatches(reports: MunicipalityReport[]): number {
  return reports.reduce((sum, r) => sum + r.missing + r.extra + r.diff, 0);
}

/**
 * 突合対象の target 一覧を決める。
 * - filterArg 指定時はその 1 件だけ（明示要求は CI 除外でも尊重する）。
 * - 未指定時は CI 除外自治体を外す。CI では scraperCiExcluded の自治体が
 *   dual-write されず D1 に届かないため、突合すると永久 MISSING になるのを防ぐ。
 *   playwright.config.ts の testIgnore と同じ registry 駆動の除外。
 * - forceInclude に載る target は CI 除外から個別解除する（SCRAPER_FORCE_INCLUDE 相当）。
 */
export function resolveParityTargets(opts: {
  allTargets: string[];
  ciExcludedTargets: string[];
  forceInclude: string[];
  filterArg?: string | undefined;
}): string[] {
  const { allTargets, ciExcludedTargets, forceInclude, filterArg } = opts;
  if (filterArg) return allTargets.filter((t) => t === filterArg);
  const excluded = new Set(ciExcludedTargets.filter((t) => !forceInclude.includes(t)));
  return allTargets.filter((t) => !excluded.has(t));
}
