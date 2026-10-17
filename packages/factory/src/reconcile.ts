import { classifyDependabotPr } from "./dependabot.ts";
import type {
  DependabotPr,
  ItemState,
  MasterCi,
  MunicipalityStatus,
  Op,
  RunSummary,
  WorkItem,
} from "./types.ts";
import { renderBody } from "./workItem.ts";

export const LABELS = {
  base: "factory",
  queued: "factory:queued",
  running: "factory:running",
  prOpen: "factory:pr-open",
  needsHuman: "factory:needs-human",
  hold: "factory:hold",
} as const;

// 状態ラベルは同時に 1 つだけ付く。
const STATE_LABELS: readonly string[] = [
  LABELS.queued,
  LABELS.running,
  LABELS.prOpen,
  LABELS.needsHuman,
];

/** 単発の失敗は retry と次回の実行に任せ、この回数続いたものだけを作業にする。 */
export const THRESHOLD = 2;

const OBSERVE_NOTE = "_observe モード：factory が on なら、ここでステーションを起動していた。_";

export interface ReconcileInput {
  /** 定期実行の run summary。新しい順。 */
  readonly summaries: readonly RunSummary[];
  readonly masterCi: MasterCi | null;
  readonly dependabotPrs: readonly DependabotPr[];
  readonly items: readonly WorkItem[];
}

interface Desired {
  readonly key: string;
  readonly title: string;
  readonly text: string;
  readonly state: ItemState;
  readonly stateLabel: string;
  readonly assignOwner: boolean;
}

interface Resolved {
  readonly key: string;
  readonly reason: string;
}

function consecutive(
  summaries: readonly RunSummary[],
  municipality: string,
  statuses: readonly MunicipalityStatus[]
): number {
  let n = 0;
  for (const s of summaries) {
    const m = s.municipalities.find((x) => x.municipality === municipality);
    if (m === undefined || !statuses.includes(m.status)) break;
    n++;
  }
  return n;
}

function scraperDesired(summaries: readonly RunSummary[]): {
  desired: Desired[];
  resolved: Resolved[];
} {
  const desired: Desired[] = [];
  const resolved: Resolved[] = [];
  const latest = summaries[0];
  if (latest === undefined) return { desired, resolved };

  for (const m of latest.municipalities) {
    if (m.status === "ok") {
      const reason = `run ${latest.runId}（${latest.runUrl}）で ${m.municipality} は全シャード成功したためクローズする。`;
      resolved.push({ key: `scraper-repair:${m.municipality}`, reason });
      resolved.push({ key: `infra:${m.municipality}`, reason });
      continue;
    }
    const facilities =
      m.failedFacilities.length > 0 ? m.failedFacilities.join("、") : "（レコードなし）";
    const repairN = consecutive(summaries, m.municipality, ["structural", "unknown"]);
    if (repairN >= THRESHOLD) {
      desired.push({
        key: `scraper-repair:${m.municipality}`,
        title: `[factory] スクレイパー修復: ${m.municipality}`,
        text: [
          `${m.municipality} の定期実行が ${repairN} 回連続で構造系の失敗（${m.status}）になっている。`,
          "",
          `- 失敗施設: ${facilities}`,
          `- 最新 run: ${latest.runUrl}`,
          `- 手動で直す場合: \`/repair-scraper ${m.municipality}\``,
          "",
          OBSERVE_NOTE,
        ].join("\n"),
        state: { consecutive: repairN, lastRunId: latest.runId },
        stateLabel: LABELS.queued,
        assignOwner: false,
      });
    }
    const infraN = consecutive(summaries, m.municipality, ["infra"]);
    if (infraN >= THRESHOLD) {
      desired.push({
        key: `infra:${m.municipality}`,
        title: `[factory] 国内 proxy の経路断: ${m.municipality}`,
        text: [
          `${m.municipality} の定期実行が ${infraN} 回連続で国内 proxy の経路断になっている。`,
          "エージェントでは直せない。Mac のスリープ、cloudflared、tinyproxy を確認する（packages/scraper/tools/jp-proxy/README.md）。",
          "",
          `- 最新 run: ${latest.runUrl}`,
        ].join("\n"),
        state: { consecutive: infraN, lastRunId: latest.runId },
        stateLabel: LABELS.needsHuman,
        assignOwner: true,
      });
    }
  }
  return { desired, resolved };
}

function masterDesired(masterCi: MasterCi | null): { desired: Desired[]; resolved: Resolved[] } {
  if (masterCi?.conclusion === "failure") {
    return {
      desired: [
        {
          key: "master-red",
          title: "[factory] master の CI が赤い",
          text: [`master の Node CI が失敗している: ${masterCi.url}`, "", OBSERVE_NOTE].join("\n"),
          state: { consecutive: 1, lastRunId: null },
          stateLabel: LABELS.queued,
          assignOwner: false,
        },
      ],
      resolved: [],
    };
  }
  if (masterCi?.conclusion === "success") {
    return {
      desired: [],
      resolved: [{ key: "master-red", reason: `master の Node CI が緑に戻った: ${masterCi.url}` }],
    };
  }
  return { desired: [], resolved: [] };
}

function itemOp(d: Desired, existing: WorkItem | undefined): Op | null {
  const body = renderBody(d.key, d.state, d.text);
  if (existing === undefined) {
    return {
      type: "create",
      key: d.key,
      title: d.title,
      body,
      labels: [LABELS.base, d.stateLabel],
      assignOwner: d.assignOwner,
    };
  }
  if (existing.labels.includes(LABELS.hold)) return null;
  const current = STATE_LABELS.find((l) => existing.labels.includes(l));
  // 人間への引き渡しは一方向。reconcile が needs-human を外すことはない。
  const target = current === LABELS.needsHuman ? LABELS.needsHuman : d.stateLabel;
  const stateChanged =
    existing.state?.consecutive !== d.state.consecutive ||
    existing.state?.lastRunId !== d.state.lastRunId;
  if (!stateChanged && current === target) return null;
  return {
    type: "edit",
    number: existing.number,
    body,
    addLabels: current === target ? [] : [target],
    removeLabels: STATE_LABELS.filter((l) => l !== target && existing.labels.includes(l)),
    assignOwner: target === LABELS.needsHuman && current !== LABELS.needsHuman,
    comment: null,
  };
}

const DEPENDABOT_COMMENT = {
  "auto-merge":
    "observe モード：factory が on なら auto-merge を有効にしていた（CI 緑、patch または minor）。",
  investigate: "observe モード：factory が on なら CI 失敗の原因調査を起動していた。",
  "needs-human":
    "major 更新、Cloudflare ツールチェイン、またはバージョンを読めない更新を含むため、人間の判断が要る。",
} as const;

function dependabotOp(pr: DependabotPr): Op | null {
  if (pr.labels.includes(LABELS.hold)) return null;
  const decision = classifyDependabotPr(pr);
  if (decision === "wait") return null;
  const target = decision === "needs-human" ? LABELS.needsHuman : LABELS.queued;
  const hasBase = pr.labels.includes(LABELS.base);
  const current = STATE_LABELS.find((l) => pr.labels.includes(l));
  if (hasBase && current === target) return null;
  return {
    type: "edit",
    number: pr.number,
    body: null,
    addLabels: [...(hasBase ? [] : [LABELS.base]), ...(current === target ? [] : [target])],
    removeLabels: STATE_LABELS.filter((l) => l !== target && pr.labels.includes(l)),
    assignOwner: target === LABELS.needsHuman,
    comment: DEPENDABOT_COMMENT[decision],
  };
}

/**
 * 現在の状態（サマリ、CI、PR、既存の作業項目）から、作業項目 Issue への操作を計算する。
 * 副作用を持たず、同じ入力には同じ操作を返す。
 */
export function reconcile(input: ReconcileInput): Op[] {
  const byKey = new Map(input.items.map((i) => [i.key, i]));
  const scraper = scraperDesired(input.summaries);
  const master = masterDesired(input.masterCi);
  const ops: Op[] = [];

  for (const d of [...scraper.desired, ...master.desired]) {
    const op = itemOp(d, byKey.get(d.key));
    if (op !== null) ops.push(op);
  }
  for (const r of [...scraper.resolved, ...master.resolved]) {
    const existing = byKey.get(r.key);
    if (existing === undefined || existing.labels.includes(LABELS.hold)) continue;
    ops.push({ type: "close", number: existing.number, comment: r.reason });
  }
  for (const pr of input.dependabotPrs) {
    const op = dependabotOp(pr);
    if (op !== null) ops.push(op);
  }
  return ops;
}
