import { gh } from "./gh.ts";
import { LABELS } from "./reconcile.ts";
import type { Op } from "./types.ts";

const LABEL_SPECS: readonly { name: string; color: string; description: string }[] = [
  { name: LABELS.base, color: "5319e7", description: "software factory の作業項目" },
  { name: LABELS.queued, color: "c5def5", description: "factory: 起動待ち" },
  { name: LABELS.running, color: "0e8a16", description: "factory: ステーション実行中" },
  { name: LABELS.prOpen, color: "1d76db", description: "factory: PR を出してゲート待ち" },
  { name: LABELS.needsHuman, color: "d93f0b", description: "factory: 人間の判断が要る" },
  { name: LABELS.hold, color: "000000", description: "factory: この項目に手を出さない" },
];

function api(method: string, endpoint: string, payload: unknown): string {
  return gh(["api", "-X", method, endpoint, "--input", "-"], JSON.stringify(payload));
}

export function ensureLabels(): void {
  for (const l of LABEL_SPECS) {
    gh(["label", "create", l.name, "--color", l.color, "--description", l.description, "--force"]);
  }
}

/** Issue と PR は同じ issues API で扱える（ラベル、コメント、assign）。 */
export function applyOps(ops: readonly Op[], owner: string): void {
  for (const op of ops) {
    switch (op.type) {
      case "create": {
        const created = JSON.parse(
          api("POST", "repos/{owner}/{repo}/issues", {
            title: op.title,
            body: op.body,
            labels: op.labels,
            assignees: op.assignOwner ? [owner] : [],
          })
        ) as { number: number };
        console.log(`created #${created.number} (${op.key})`);
        break;
      }
      case "edit": {
        const issue = `repos/{owner}/{repo}/issues/${op.number}`;
        if (op.body !== null) api("PATCH", issue, { body: op.body });
        if (op.addLabels.length > 0) api("POST", `${issue}/labels`, { labels: op.addLabels });
        for (const label of op.removeLabels) {
          gh(["api", "-X", "DELETE", `${issue}/labels/${encodeURIComponent(label)}`]);
        }
        if (op.assignOwner) api("POST", `${issue}/assignees`, { assignees: [owner] });
        if (op.comment !== null) api("POST", `${issue}/comments`, { body: op.comment });
        console.log(`edited #${op.number}`);
        break;
      }
      case "close": {
        const issue = `repos/{owner}/{repo}/issues/${op.number}`;
        api("POST", `${issue}/comments`, { body: op.comment });
        api("PATCH", issue, { state: "closed", state_reason: "completed" });
        console.log(`closed #${op.number}`);
        break;
      }
    }
  }
}
