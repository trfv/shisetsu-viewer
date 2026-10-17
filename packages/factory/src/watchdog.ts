import { LABELS } from "./reconcile.ts";
import type { Op, WorkItem } from "./types.ts";
import { renderBody } from "./workItem.ts";

export function isStale(lastRunAt: string | null, now: Date, maxAgeHours: number): boolean {
  if (lastRunAt === null) return true;
  return now.getTime() - Date.parse(lastRunAt) > maxAgeHours * 60 * 60 * 1000;
}

/** 相手の workflow の最終実行が古ければ needs-human の項目を立て、動いていれば閉じる。 */
export function watchdogOps(input: {
  key: string;
  workflow: string;
  lastRunAt: string | null;
  now: Date;
  maxAgeHours: number;
  existing: WorkItem | null;
}): Op[] {
  if (isStale(input.lastRunAt, input.now, input.maxAgeHours)) {
    if (input.existing !== null) return [];
    const text = [
      `${input.workflow} の最終実行が ${input.maxAgeHours} 時間以上前（${input.lastRunAt ?? "記録なし"}）。`,
      "workflow が無効化されていないか（60 日無活動の自動無効化を含む）、Actions の画面で確認する。",
    ].join("\n");
    return [
      {
        type: "create",
        key: input.key,
        title: `[factory] 定期実行が止まっている: ${input.workflow}`,
        body: renderBody(input.key, { consecutive: 1, lastRunId: null }, text),
        labels: [LABELS.base, LABELS.needsHuman],
        assignOwner: true,
      },
    ];
  }
  if (input.existing === null || input.existing.labels.includes(LABELS.hold)) return [];
  return [
    {
      type: "close",
      number: input.existing.number,
      comment: `${input.workflow} が ${input.lastRunAt ?? ""} に実行されたためクローズする。`,
    },
  ];
}
