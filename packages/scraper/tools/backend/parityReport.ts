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

/**
 * dual-write が全自治体で稼働し始めた日（この日より前に更新が止まった Hasura 行は
 * 構造的に D1 へ来ないため、突合対象から外す）。
 *
 * 実測（D1 reservations の MIN(updated_at)）: chuo 2026-07-15T03:17Z、
 * 他 8 自治体 2026-07-15T10:20〜10:38Z。全自治体が揃った翌日を安全側の境界とする。
 * Hasura の updated_at は "YYYY-MM-DDTHH:MM:SS.ffffff" 形式で、日付前方一致の
 * 辞書順比較がそのまま時系列比較になる。
 */
export const DUAL_WRITE_LIVE_SINCE = "2026-07-16";

/** Hasura 側の 1 行。updatedAt は遺物（stale）判定に使う。 */
export interface HasuraRow {
  /** canonicalize 済み reservation 文字列 */
  reservation: string;
  /** Hasura の updated_at（ISO 風文字列。辞書順比較する） */
  updatedAt: string;
}

export interface MunicipalityReport {
  target: string;
  hasuraRows: number;
  d1Rows: number;
  /** Hasura にあり D1 に無い（dual-write 開始以降に更新された行のみ）= 実バグ */
  missing: number;
  /** D1 にあり Hasura に無い */
  extra: number;
  /** 両方にあるが reservation が異なる */
  diff: number;
  /**
   * Hasura にあり D1 に無いが、Hasura 側の更新が dual-write 開始前で止まっている行。
   * スクレイプ対象から外れた施設や horizon 外の日付の「Hasura にだけ残る死んだ行」で、
   * D1 へは原理的に届かない。ゲートには含めず件数のみ報告する（Issue #1622）。
   */
  stale: number;
  samples: string[];
}

/**
 * 1 自治体分の Hasura / D1 を突合する。
 * 値は両側とも canonicalize 済みである前提なので、比較は素の文字列比較でよい。
 *
 * D1 に行が存在するのに内容が違う場合（DIFF）は、Hasura 側の更新が古くても実バグとして数える。
 * 行が届いている以上「dual-write に来なかった」では説明できないため。
 */
export function compareMunicipality(
  target: string,
  hasura: Map<string, HasuraRow>,
  d1: Map<string, string>,
  liveSince: string = DUAL_WRITE_LIVE_SINCE
): MunicipalityReport {
  const samples: string[] = [];
  let missing = 0;
  let extra = 0;
  let diff = 0;
  let stale = 0;

  const addSample = (line: string): void => {
    if (samples.length < SAMPLE_LIMIT) samples.push(line);
  };

  for (const [k, hrow] of hasura) {
    const dval = d1.get(k);
    if (dval === undefined) {
      if (hrow.updatedAt < liveSince) {
        // 遺物。サンプルにも載せない（本物の乖離を埋もれさせないため）
        stale++;
      } else {
        missing++;
        addSample(`MISSING in D1: ${k}`);
      }
    } else if (dval !== hrow.reservation) {
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

  return { target, hasuraRows: hasura.size, d1Rows: d1.size, missing, extra, diff, stale, samples };
}

/** ゲート判定に使う乖離件数。stale は原理的に解消しないため含めない。 */
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
