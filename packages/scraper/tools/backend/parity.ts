import {
  canonicalizeReservation,
  getReservationTargets,
  MUNICIPALITIES,
  type MunicipalityConfig,
} from "@shisetsu-viewer/shared";

import { graphqlRequest } from "../request.ts";
import { exportReservations } from "./d1Api.ts";
import {
  compareMunicipality,
  DUAL_WRITE_LIVE_SINCE,
  reservationWindow,
  resolveParityTargets,
  totalMismatches,
} from "./parityReport.ts";
import type { HasuraRow, MunicipalityReport } from "./parityReport.ts";

/**
 * Hasura と D1 の予約データを突合する。
 * 使い方: node --env-file=.env tools/backend/parity.ts [municipality]
 * 前提 env: GRAPHQL_ENDPOINT + M2M_TOKEN（Hasura）/ D1_API_ENDPOINT + ADMIN_API_KEY（D1）
 *
 * 突合内容:
 *  1. 自治体×日付×施設ごとの件数一致
 *  2. reservation の一致（両側 canonicalize して文字列比較）
 * 突合対象は [今日, 今日の月末 + 5 ヶ月] の窓に両側そろえる（母集団ずれの偽陽性を防ぐ）。
 * さらに Hasura 側の更新が dual-write 開始前で止まっている行は stale として突合から外す
 * （Hasura は upsert のみで行を消さないため、スクレイプ対象外になった施設や horizon 外の
 * 日付の行が残り続ける。D1 へは原理的に届かず、ゲートが永久に到達不能になる。Issue #1622）。
 * 乖離 0 なら "PARITY OK"、あれば行キーと差分を列挙して exit 1。
 * 併せて最終行に `PARITY_REPORT <json>`（MunicipalityReport[]）を出す。CI がこれを読む。
 */
const HASURA_PAGE = 1000;

function key(r: { institution_id: string; date: string }): string {
  return `${r.institution_id} ${r.date}`;
}

/**
 * Hasura の全 reservations を 1 回だけ取得し、自治体別に振り分ける。
 * reservations テーブルには institution へのリレーションが無いので、
 * institutions を引いて institution_id → municipality を作り、クライアント側で分類する
 * （searchable_reservations 経由は音楽室フィルタで母集団がずれるため使わない）。
 */
async function fetchAllHasura(window: {
  from: string;
  to: string;
}): Promise<Map<string, Map<string, HasuraRow>>> {
  const instRes = await graphqlRequest<{
    institutions: { id: string; municipality: string }[];
  }>(`{ institutions { id municipality } }`);
  const idToMunicipality = new Map(instRes.institutions.map((i) => [i.id, i.municipality]));

  const byMunicipality = new Map<string, Map<string, HasuraRow>>();
  const { from, to } = window;
  let offset = 0;
  for (;;) {
    const response = await graphqlRequest<{
      reservations: {
        institution_id: string;
        date: string;
        reservation: Record<string, string>;
        updated_at: string;
      }[];
    }>(
      `query parity($from: date!, $to: date!, $limit: Int!, $offset: Int!) {
        reservations(
          where: { date: { _gte: $from, _lte: $to } }
          order_by: { id: asc }
          limit: $limit
          offset: $offset
        ) { institution_id date reservation updated_at }
      }`,
      { from, to, limit: HASURA_PAGE, offset }
    );
    const batch = response.reservations;
    if (batch.length === 0) break;
    for (const r of batch) {
      const municipality = idToMunicipality.get(r.institution_id);
      if (!municipality) continue;
      let map = byMunicipality.get(municipality);
      if (!map) {
        map = new Map<string, HasuraRow>();
        byMunicipality.set(municipality, map);
      }
      map.set(key(r), {
        reservation: canonicalizeReservation(r.reservation),
        updatedAt: r.updated_at,
      });
    }
    offset += HASURA_PAGE;
    if (batch.length < HASURA_PAGE) break;
  }
  return byMunicipality;
}

const forceInclude = (process.env["SCRAPER_FORCE_INCLUDE"] ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const ciExcludedTargets = Object.values<MunicipalityConfig>(MUNICIPALITIES)
  .filter((m) => m.scraperCiExcluded)
  .map((m) => `${m.prefecture}-${m.slug}`);

const targets = resolveParityTargets({
  allTargets: getReservationTargets(),
  ciExcludedTargets,
  forceInclude,
  filterArg: process.argv[2],
});

// dual-write 開始前に更新が止まった Hasura 行を突合対象から外す境界。
// 通常は既定値でよく、env は障害調査で境界を動かして影響範囲を見るための逃げ道。
const liveSince = process.env["PARITY_LIVE_SINCE"] ?? DUAL_WRITE_LIVE_SINCE;

const window = reservationWindow(new Date());
const hasuraByMunicipality = await fetchAllHasura(window);

const reports: MunicipalityReport[] = [];

for (const target of targets) {
  const [, m] = target.split("-");
  const municipality = `MUNICIPALITY_${(m as string).toUpperCase()}`;

  const hasura = hasuraByMunicipality.get(municipality) ?? new Map<string, HasuraRow>();
  const d1Rows = await exportReservations(municipality);
  // D1 は全期間を返すので Hasura と同じ窓に絞る（ISO 日付は辞書順 = 時系列順）。
  const d1 = new Map(
    d1Rows
      .filter((r) => r.date >= window.from && r.date <= window.to)
      .map((r) => [key(r), canonicalizeReservation(r.reservation)])
  );

  const report = compareMunicipality(target, hasura, d1, liveSince);
  reports.push(report);

  const staleNote = report.stale > 0 ? ` stale=${report.stale}` : "";
  const localMismatch = report.missing + report.extra + report.diff;
  if (localMismatch === 0) {
    console.log(`PARITY OK ${target} rows=${report.hasuraRows}${staleNote}`);
  } else {
    console.error(`PARITY FAIL ${target}: ${localMismatch} mismatches`);
    for (const line of report.samples) console.error(`  ${line}`);
    if (localMismatch > report.samples.length) {
      console.error(`  ... and ${localMismatch - report.samples.length} more`);
    }
  }
}

// CI の parity job がこの 1 行を拾って Issue 本文を組み立てる。
// この行が出ていない = 突合に到達していない（インフラ障害）と CI 側で判定される。
console.log(`PARITY_REPORT ${JSON.stringify(reports)}`);

if (totalMismatches(reports) > 0) process.exit(1);
